use crate::script::ast::*;
pub use crate::script::ast::Value;
use std::collections::HashMap;

#[derive(Default)]
pub struct Evaluator {
    pub env: HashMap<String, Value>,
}

impl Evaluator {
    pub fn evaluate(&mut self, expr: &Expr) -> Result<Value, String> {
        match expr {
            Expr::Literal(v) => Ok(v.clone()),
            Expr::Var(name) => {
                self.env
                    .get(name)
                    .cloned()
                    .ok_or_else(|| format!("Undefined variable: {name}"))
            }
            Expr::Binary { left, op, right } => self.eval_binary(left, op, right),
            Expr::Unary { op, expr } => self.eval_unary(op, expr),
            Expr::Call { callee, args } => self.eval_call(callee, args),
            Expr::Index { target, index } => self.eval_index(target, index),
            Expr::DotAccess { target, field } => {
                let t = self.evaluate(target)?;
                match t {
                    Value::Map(map) => map.get(field).cloned().ok_or_else(|| format!("Key '{field}' not found")),
                    _ => Err(format!("Cannot access field '{field}' on non-object")),
                }
            }
            Expr::Match { value, arms, default } => {
                let val = self.evaluate(value)?;
                let mut matched = false;
                let mut result = Value::Nil;
                for (pattern, arm) in arms {
                    if self.values_equal(&val, pattern) {
                        result = self.evaluate(arm)?;
                        matched = true;
                        break;
                    }
                }
                if !matched {
                    if let Some(def) = default {
                        result = self.evaluate(def)?;
                    }
                }
                Ok(result)
            }
            Expr::Object(fields) => {
                let mut map = std::collections::HashMap::new();
                for (key, expr) in fields {
                    map.insert(key.clone(), self.evaluate(expr)?);
                }
                Ok(Value::Map(map))
            }
            Expr::If { condition, then_branch, else_branch } => {
                if self.evaluate(condition)?.as_bool() {
                    self.evaluate(then_branch)
                } else if let Some(els) = else_branch {
                    self.evaluate(els)
                } else {
                    Ok(Value::Nil)
                }
            }
            Expr::Let { name, value, body } => {
                let v = self.evaluate(value)?;
                self.env.insert(name.clone(), v.clone());
                let result = self.evaluate(body)?;
                self.env.remove(name);
                Ok(result)
            }
            Expr::Fn { params, body } => Ok(Value::Map(HashMap::from([
                ("__fn_params".to_string(), Value::List(params.iter().map(|p| Value::Str(p.clone())).collect())),
                ("__fn_body".to_string(), Value::Str(format!("{body:?}"))),
            ]))),
            Expr::Pipe { left, right } => {
                let left_val = self.evaluate(left)?;
                if let Expr::Call { callee, args } = right.as_ref() {
                    let mut new_args = vec![left_val];
                    for a in args {
                        new_args.push(self.evaluate(a)?);
                    }
                    if let Expr::Var(name) = callee.as_ref() {
                        self.eval_call_with_values(name, &new_args)
                    } else {
                        Err("Can only pipe into functions".to_string())
                    }
                } else {
                    self.env.insert("__pipe_input".to_string(), left_val);
                    let result = self.evaluate(right)?;
                    self.env.remove("__pipe_input");
                    Ok(result)
                }
            }
            Expr::Block(exprs) => {
                let mut last = Value::Nil;
                for e in exprs {
                    last = self.evaluate(e)?;
                }
                Ok(last)
            }
            Expr::List(items) => {
                let values: Result<Vec<Value>, String> = items.iter().map(|e| self.evaluate(e)).collect();
                Ok(Value::List(values?))
            }
            Expr::ForLoop { .. } => Ok(Value::Nil),
        }
    }

    fn eval_binary(&mut self, left: &Expr, op: &BinaryOp, right: &Expr) -> Result<Value, String> {
        let l = self.evaluate(left)?;
        let r = self.evaluate(right)?;

        match op {
            BinaryOp::Add => {
                match (&l, &r) {
                    (Value::Num(a), Value::Num(b)) => Ok(Value::Num(a + b)),

                    (Value::Str(a), Value::Str(b)) => Ok(Value::Str(format!("{a}{b}"))),

                    (Value::Num(a), Value::Str(b)) => Ok(Value::Str(format!("{a}{b}"))),

                    (Value::Str(a), _) => Ok(Value::Str(format!("{a}{}", r.to_string()))),

                    (_, Value::Str(b)) => Ok(Value::Str(format!("{}{b}", l.to_string()))),

                    _ => Err(format!("Cannot add {l:?} and {r:?}")),
                }
            }
            BinaryOp::Sub => {
                let a = l.as_num().ok_or("Left side must be a number")?;
                let b = r.as_num().ok_or("Right side must be a number")?;
                Ok(Value::Num(a - b))
            }
            BinaryOp::Mul => {
                let a = l.as_num().ok_or("Left side must be a number")?;
                let b = r.as_num().ok_or("Right side must be a number")?;
                Ok(Value::Num(a * b))
            }
            BinaryOp::Div => {
                let a = l.as_num().ok_or("Left side must be a number")?;
                let b = r.as_num().ok_or("Right side must be a number")?;
                if b == 0.0 {
                    Err("Division by zero".to_string())
                } else {
                    Ok(Value::Num(a / b))
                }
            }
            BinaryOp::Mod => {
                let a = l.as_num().ok_or("Left side must be a number")?;
                let b = r.as_num().ok_or("Right side must be a number")?;
                Ok(Value::Num(a % b))
            }
            BinaryOp::Eq => Ok(Value::Bool(self.values_equal(&l, &r))),
            BinaryOp::Ne => Ok(Value::Bool(!self.values_equal(&l, &r))),
            BinaryOp::Lt => {
                Ok(Value::Bool(if let (Value::Num(a), Value::Num(b)) = (&l, &r) {
                    a < b
                } else {
                    l.to_string() < r.to_string()
                }))
            }
            BinaryOp::Gt => {
                Ok(Value::Bool(if let (Value::Num(a), Value::Num(b)) = (&l, &r) {
                    a > b
                } else {
                    l.to_string() > r.to_string()
                }))
            }
            BinaryOp::Le => {
                Ok(Value::Bool(if let (Value::Num(a), Value::Num(b)) = (&l, &r) {
                    a <= b
                } else {
                    l.to_string() <= r.to_string()
                }))
            }
            BinaryOp::Ge => {
                Ok(Value::Bool(if let (Value::Num(a), Value::Num(b)) = (&l, &r) {
                    a >= b
                } else {
                    l.to_string() >= r.to_string()
                }))
            }
        }
    }

    fn eval_unary(&mut self, op: &UnaryOp, expr: &Expr) -> Result<Value, String> {
        let v = self.evaluate(expr)?;
        match op {
            UnaryOp::Not => Ok(Value::Bool(!v.as_bool())),
            UnaryOp::Neg => {
                let n = v.as_num().ok_or("Cannot negate non-number")?;
                Ok(Value::Num(-n))
            }
        }
    }

    fn eval_call(&mut self, callee: &Expr, args: &[Expr]) -> Result<Value, String> {
        let mut arg_values = vec![];
        for a in args {
            arg_values.push(self.evaluate(a)?);
        }

        let Expr::Var(func_name) = callee else {
            return Err("Can only call functions and builtins".to_string());
        };

        self.call_builtin(func_name, &arg_values)
    }

    fn eval_call_with_values(&mut self, func_name: &str, arg_values: &[Value]) -> Result<Value, String> {
        self.call_builtin(func_name, arg_values)
    }

    fn eval_index(&mut self, target: &Expr, index: &Expr) -> Result<Value, String> {
        let t = self.evaluate(target)?;
        let i = self.evaluate(index)?;

        match (t, i) {
            (Value::List(items), Value::Num(n)) => {
                let idx = if n < 0.0 {
                    (items.len() as f64 + n) as usize
                } else {
                    n as usize
                };
                items.get(idx).cloned().ok_or_else(|| format!("Index {n} out of bounds"))
            }
            (Value::Str(s), Value::Num(n)) => {
                let chars: Vec<char> = s.chars().collect();
                let idx = if n < 0.0 {
                    (chars.len() as f64 + n) as usize
                } else {
                    n as usize
                };
                chars.get(idx).map(|c| Value::Str(c.to_string())).ok_or_else(|| format!("Index {n} out of bounds"))
            }
            (Value::Map(map), Value::Str(key)) => {
                map.get(&key).cloned().ok_or_else(|| format!("Key '{key}' not found"))
            }
            _ => Err("Cannot index this type".to_string()),
        }
    }

    fn call_builtin(&mut self, name: &str, args: &[Value]) -> Result<Value, String> {
        match name {
            "upper" | "lower" | "trim" | "trim_start" | "trim_end"
            | "len" | "length" | "repeat" | "replace" | "slice"
            | "split" | "contains" | "starts_with" | "ends_with"
            | "substr" | "reverse" | "pad_start" | "pad_end" | "concat"
            | "title" | "join" => self.call_str(name, args),

            "to_num" | "number" | "to_str" | "string"
            | "floor" | "ceil" | "ceiling" | "round" | "abs"
            | "min" | "max" | "clamp" | "rand" | "random" => self.call_math(name, args),

            "list" | "choice" | "first" | "last" | "map" | "filter"
            | "sort" | "join_list" => self.call_list(name, args),

            "now" | "today" | "date_add" | "date_format" => self.call_date(name, args),

            "if_then_else" | "__builtin_or" | "__builtin_and" => self.call_logic(name, args),

            _ => Ok(self.env.get(name).cloned().unwrap_or(Value::Str(format!("{{{{{name}}}}}")))),
        }
    }

    fn arg1_str(&self, args: &[Value]) -> String {
        args.first().map(|v| v.to_string()).unwrap_or_default()
    }

    fn call_str(&mut self, name: &str, args: &[Value]) -> Result<Value, String> {
        match name {
            "upper" => Ok(Value::Str(self.arg1_str(args).to_uppercase())),
            "lower" => Ok(Value::Str(self.arg1_str(args).to_lowercase())),
            "trim" => Ok(Value::Str(self.arg1_str(args).trim().to_string())),
            "trim_start" => Ok(Value::Str(self.arg1_str(args).trim_start().to_string())),
            "trim_end" => Ok(Value::Str(self.arg1_str(args).trim_end().to_string())),
            "len" | "length" => {
                match args.first() {
                    Some(Value::List(items)) => Ok(Value::Num(items.len() as f64)),
                    Some(Value::Str(s)) => Ok(Value::Num(s.chars().count() as f64)),
                    _ => Ok(Value::Num(self.arg1_str(args).chars().count() as f64)),
                }
            }
            "repeat" => {
                let s = args.first().ok_or("repeat requires a string")?.to_string();
                let n = args.get(1).and_then(|v| v.as_num()).ok_or("repeat requires a count")? as usize;
                Ok(Value::Str(s.repeat(n)))
            }
            "replace" => {
                let s = args.get(0).ok_or("replace requires 3 arguments")?.to_string();
                let from = args.get(1).ok_or("replace requires 3 arguments")?.to_string();
                let to = args.get(2).ok_or("replace requires 3 arguments")?.to_string();
                Ok(Value::Str(s.replace(&from, &to)))
            }
            "slice" => {
                let s = args.get(0).ok_or("slice requires 3 arguments")?.to_string();
                let start = args.get(1).and_then(|v| v.as_num()).ok_or("start must be a number")? as usize;
                let end = args.get(2).and_then(|v| v.as_num()).ok_or("end must be a number")? as usize;
                let chars: Vec<char> = s.chars().collect();
                if start > chars.len() || end > chars.len() || start > end {
                    return Err("slice indices out of bounds".to_string());
                }
                Ok(Value::Str(chars[start..end].iter().collect()))
            }
            "split" => {
                let s = args.get(0).ok_or("split requires 2 arguments")?.to_string();
                let delim = args.get(1).ok_or("split requires a delimiter")?.to_string();
                let parts: Vec<Value> = s.split(&delim).map(|p| Value::Str(p.to_string())).collect();
                Ok(Value::List(parts))
            }
            "contains" => {
                let s = args.get(0).ok_or("contains requires 2 arguments")?.to_string();
                let sub = args.get(1).ok_or("contains requires a substring")?.to_string();
                Ok(Value::Bool(s.contains(&sub)))
            }
            "starts_with" => {
                let s = args.get(0).ok_or("starts_with requires 2 arguments")?.to_string();
                let prefix = args.get(1).ok_or("starts_with requires a prefix")?.to_string();
                Ok(Value::Bool(s.starts_with(&prefix)))
            }
            "ends_with" => {
                let s = args.get(0).ok_or("ends_with requires 2 arguments")?.to_string();
                let suffix = args.get(1).ok_or("ends_with requires a suffix")?.to_string();
                Ok(Value::Bool(s.ends_with(&suffix)))
            }
            "substr" => {
                let s = args.get(0).ok_or("substr requires 3 arguments")?.to_string();
                let start = args.get(1).and_then(|v| v.as_num()).ok_or("start must be a number")? as usize;
                let len = args.get(2).and_then(|v| v.as_num()).ok_or("length must be a number")? as usize;
                let chars: Vec<char> = s.chars().collect();
                let start = start.min(chars.len());
                let end = (start + len).min(chars.len());
                Ok(Value::Str(chars[start..end].iter().collect()))
            }
            "reverse" => {
                match args.first() {
                    Some(Value::List(items)) => {
                        let mut rev = items.clone();
                        rev.reverse();
                        Ok(Value::List(rev))
                    }
                    Some(Value::Str(s)) => Ok(Value::Str(s.chars().rev().collect())),
                    _ => Err("reverse requires a list or string".to_string()),
                }
            }
            "pad_start" => {
                let s = args.get(0).ok_or("pad_start requires string and length")?.to_string();
                let target = args.get(1).and_then(|v| v.as_num()).ok_or("length must be a number")? as usize;
                let ch = args.get(2).and_then(|v| v.to_string().chars().next()).unwrap_or(' ');
                let pad_len = target.saturating_sub(s.chars().count());
                let padding: String = std::iter::repeat_n(ch, pad_len).collect();
                Ok(Value::Str(format!("{padding}{s}")))
            }
            "pad_end" => {
                let s = args.get(0).ok_or("pad_end requires string and length")?.to_string();
                let target = args.get(1).and_then(|v| v.as_num()).ok_or("length must be a number")? as usize;
                let ch = args.get(2).and_then(|v| v.to_string().chars().next()).unwrap_or(' ');
                let pad_len = target.saturating_sub(s.chars().count());
                let padding: String = std::iter::repeat_n(ch, pad_len).collect();
                Ok(Value::Str(format!("{s}{padding}")))
            }
            "concat" => {
                let parts: Vec<String> = args.iter().map(|v| v.to_string()).collect();
                Ok(Value::Str(parts.join("")))
            }
            "title" => {
                let s = self.arg1_str(args);
                let mut result = String::with_capacity(s.len());
                let mut upper = true;
                for c in s.chars() {
                    if c.is_whitespace() || c == '-' || c == '_' {
                        upper = true;
                        result.push(c);
                    } else if upper {
                        result.extend(c.to_uppercase());
                        upper = false;
                    } else {
                        result.extend(c.to_lowercase());
                    }
                }
                Ok(Value::Str(result))
            }
            "join" => {
                let sep = args.get(1).map(|v| v.to_string()).unwrap_or_default();
                let parts = match args.first() {
                    Some(Value::List(items)) => items.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(&sep),
                    v => v.map(|v| v.to_string()).unwrap_or_default(),
                };
                Ok(Value::Str(parts))
            }
            _ => Err(format!("Unknown string function: {name}")),
        }
    }

    fn call_math(&mut self, name: &str, args: &[Value]) -> Result<Value, String> {
        match name {
            "to_num" | "number" => {
                let s = self.arg1_str(args);
                s.parse::<f64>().map(Value::Num)
                    .map_err(|_| format!("Cannot convert '{s}' to number"))
            }
            "to_str" | "string" => {
                Ok(Value::Str(args.first().cloned().unwrap_or(Value::Nil).to_string()))
            }
            "floor" => {
                let n = args.first().and_then(|v| v.as_num()).ok_or("floor requires a number")?;
                Ok(Value::Num(n.floor()))
            }
            "ceil" | "ceiling" => {
                let n = args.first().and_then(|v| v.as_num()).ok_or("ceil requires a number")?;
                Ok(Value::Num(n.ceil()))
            }
            "round" => {
                let n = args.first().and_then(|v| v.as_num()).ok_or("round requires a number")?;
                Ok(Value::Num(n.round()))
            }
            "abs" => {
                let n = args.first().and_then(|v| v.as_num()).ok_or("abs requires a number")?;
                Ok(Value::Num(n.abs()))
            }
            "min" | "max" => {
                if args.is_empty() {
                    return Err(format!("{name} requires at least one number"));
                }
                let cmp = if name == "min" { f64::min as fn(f64, f64) -> f64 } else { f64::max };
                let mut result = args[0].as_num().ok_or("min/max requires numbers")?;
                for a in &args[1..] {
                    result = cmp(result, a.as_num().ok_or("min/max requires numbers")?);
                }
                Ok(Value::Num(result))
            }
            "clamp" => {
                let v = args.get(0).and_then(|a| a.as_num()).ok_or("clamp requires numbers")?;
                let lo = args.get(1).and_then(|a| a.as_num()).ok_or("clamp requires numbers")?;
                let hi = args.get(2).and_then(|a| a.as_num()).ok_or("clamp requires numbers")?;
                Ok(Value::Num(v.clamp(lo, hi)))
            }
            "rand" | "random" => {
                let seed = nano_seed();
                if args.len() == 2 {
                    let lo = args[0].as_num().ok_or("random requires numbers")? as i64;
                    let hi = args[1].as_num().ok_or("random requires numbers")? as i64;
                    let range = (hi - lo + 1) as u64;
                    Ok(Value::Num((lo + ((seed % range) as i64)) as f64))
                } else if args.is_empty() {
                    Ok(Value::Num((seed % 1000) as f64 / 1000.0))
                } else {
                    Err("random takes 0 or 2 arguments".to_string())
                }
            }
            _ => Err(format!("Unknown math function: {name}")),
        }
    }

    fn call_list(&mut self, name: &str, args: &[Value]) -> Result<Value, String> {
        match name {
            "list" => Ok(Value::List(args.to_vec())),
            "choice" => {
                let items = match args.first() {
                    Some(Value::List(items)) if !items.is_empty() => items.clone(),
                    Some(Value::List(_)) => return Err("choice requires a non-empty list".to_string()),
                    _ => {
                        if args.is_empty() {
                            return Err("choice requires arguments".to_string());
                        }
                        args.to_vec()
                    }
                };
                let seed = nano_seed();
                Ok(items[(seed % items.len() as u64) as usize].clone())
            }
            "first" => {
                match args.first() {
                    Some(Value::List(items)) => items.first().cloned().ok_or_else(|| "Empty list".to_string()),
                    Some(Value::Str(s)) => s.chars().next().map(|c| Value::Str(c.to_string())).ok_or_else(|| "Empty string".to_string()),
                    _ => Err("first requires a list or string".to_string()),
                }
            }
            "last" => {
                match args.first() {
                    Some(Value::List(items)) => items.last().cloned().ok_or_else(|| "Empty list".to_string()),
                    Some(Value::Str(s)) => s.chars().last().map(|c| Value::Str(c.to_string())).ok_or_else(|| "Empty string".to_string()),
                    _ => Err("last requires a list or string".to_string()),
                }
            }
            "map" => {
                let items = match args.first() {
                    Some(Value::List(items)) => items.clone(),
                    v => v.map(|v| v.clone()).map(|v| vec![v]).unwrap_or_default(),
                };
                let fn_name = args.get(1).ok_or("map requires a function name")?.to_string();
                let mut results = Vec::with_capacity(items.len());
                for item in &items {
                    self.env.insert("__item".to_string(), item.clone());
                    results.push(self.call_builtin(&fn_name, std::slice::from_ref(item))?);
                    self.env.remove("__item");
                }
                Ok(Value::List(results))
            }
            "filter" => {
                let items = match args.first() {
                    Some(Value::List(items)) => items.clone(),
                    v => v.map(|v| v.clone()).map(|v| vec![v]).unwrap_or_default(),
                };
                let cond_fn = args.get(1).ok_or("filter requires a condition function")?.to_string();
                let mut results = Vec::with_capacity(items.len());
                for item in &items {
                    self.env.insert("__item".to_string(), item.clone());
                    let cond = self.call_builtin(&cond_fn, std::slice::from_ref(item))?;
                    if cond.as_bool() {
                        results.push(item.clone());
                    }
                    self.env.remove("__item");
                }
                Ok(Value::List(results))
            }
            "sort" => {
                let mut items = match args.first() {
                    Some(Value::List(items)) => items.clone(),
                    _ => return Err("sort requires a list".to_string()),
                };
                items.sort_by(|a, b| a.to_string().cmp(&b.to_string()));
                Ok(Value::List(items))
            }
            "join_list" => {
                let Value::List(items) = args.first().ok_or("join_list requires a list")? else {
                    return Err("join_list requires a list".to_string());
                };
                let sep = args.get(1).map(|v| v.to_string()).unwrap_or_default();
                let result: Vec<String> = items.iter().map(|v| v.to_string()).collect();
                Ok(Value::Str(result.join(&sep)))
            }
            _ => Err(format!("Unknown list function: {name}")),
        }
    }

    fn call_date(&mut self, name: &str, args: &[Value]) -> Result<Value, String> {
        match name {
            "now" => {
                let fmt = args.first().map(|v| v.to_string()).unwrap_or_else(|| "%Y-%m-%d %H:%M:%S".to_string());
                Ok(Value::Str(chrono::Local::now().format(&fmt).to_string()))
            }
            "today" => {
                let fmt = args.first().map(|v| v.to_string()).unwrap_or_else(|| "%Y-%m-%d".to_string());
                Ok(Value::Str(chrono::Local::now().format(&fmt).to_string()))
            }
            "date_add" => {
                let s = args.get(0).ok_or("date_add requires date string and days")?.to_string();
                let days = args.get(1).and_then(|v| v.as_num()).ok_or("days must be a number")? as i64;
                match chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d") {
                    Ok(dt) => Ok(Value::Str((dt + chrono::Duration::days(days)).format("%Y-%m-%d").to_string())),
                    Err(_) => {
                        let dt = chrono::Local::now().date_naive();
                        Ok(Value::Str((dt + chrono::Duration::days(days)).format(&s).to_string()))
                    }
                }
            }
            "date_format" => {
                let s = args.get(0).ok_or("date_format requires date and format")?.to_string();
                let fmt = args.get(1).ok_or("date_format requires a format string")?.to_string();
                match chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d") {
                    Ok(dt) => Ok(Value::Str(dt.format(&fmt).to_string())),
                    Err(_) => Err(format!("Cannot parse date: {s}")),
                }
            }
            _ => Err(format!("Unknown date function: {name}")),
        }
    }

    fn call_logic(&mut self, name: &str, args: &[Value]) -> Result<Value, String> {
        match name {
            "if_then_else" => {
                let cond = args.first().ok_or("if_then_else requires 3 arguments")?;
                let then = args.get(1).ok_or("if_then_else requires 3 arguments")?;
                let els = args.get(2).ok_or("if_then_else requires 3 arguments")?;
                Ok(if cond.as_bool() { then.clone() } else { els.clone() })
            }
            "__builtin_or" => Ok(Value::Bool(args.iter().any(|v| v.as_bool()))),
            "__builtin_and" => Ok(Value::Bool(args.iter().all(|v| v.as_bool()))),
            _ => Err(format!("Unknown logic function: {name}")),
        }
    }

    fn values_equal(&self, a: &Value, b: &Value) -> bool {
        match (a, b) {
            (Value::Num(x), Value::Num(y)) => (x - y).abs() < f64::EPSILON,
            (Value::Str(x), Value::Str(y)) => x == y,
            (Value::Bool(x), Value::Bool(y)) => x == y,
            (Value::Nil, Value::Nil) => true,
            _ => a.to_string() == b.to_string(),
        }
    }
}

fn nano_seed() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64
}