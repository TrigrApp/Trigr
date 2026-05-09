import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Copy, Check, Terminal, X } from "lucide-react";


type TokenType = "string" | "number" | "keyword" | "function" | "operator" | "paren" | "bracket" | "comment" | "variable" | "boolean" | "list" | "plain";

interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set(["let", "if", "else", "true", "false"]);
const BUILTIN_FUNCTIONS = new Set([
  "upper", "lower", "trim", "trim_start", "trim_end", "len", "repeat",
  "replace", "slice", "substr", "split", "contains", "starts_with",
  "ends_with", "reverse", "title", "pad_start", "pad_end", "concat",
  "now", "today", "date_add", "date_format",
  "rand", "choice", "to_num", "floor", "ceil", "round", "abs", "min", "max", "clamp", "args"
]);

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < code.length) {
    
    if (code[i] === "/" && code[i + 1] === "/") {
      let end = code.indexOf("\n", i);
      if (end === -1) end = code.length;
      tokens.push({ type: "comment", value: code.slice(i, end) });
      i = end;
      continue;
    }
    
    
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    
    
    if (/[0-9]/.test(code[i]) && (i === 0 || /[\s([{,+\-*/%=<>!]/.test(code[i - 1]))) {
      let j = i;
      while (j < code.length && /[0-9.]/.test(code[j])) j++;
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }
    
    
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      
      if (BUILTIN_FUNCTIONS.has(word)) {
        tokens.push({ type: "function", value: word });
      } else if (KEYWORDS.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (word === "true" || word === "false") {
        tokens.push({ type: "boolean", value: word });
      } else {
        tokens.push({ type: "variable", value: word });
      }
      i = j;
      continue;
    }
    
    
    if ("+-*/%=<>!".includes(code[i])) {
      tokens.push({ type: "operator", value: code[i] });
      i++;
      continue;
    }
    
    
    if ("[]".includes(code[i])) {
      tokens.push({ type: "bracket", value: code[i] });
      i++;
      continue;
    }
    
    
    if ("()".includes(code[i])) {
      tokens.push({ type: "paren", value: code[i] });
      i++;
      continue;
    }
    
    
    if (code[i] === ",") {
      tokens.push({ type: "operator", value: code[i] });
      i++;
      continue;
    }
    
    
    if (/\s/.test(code[i])) {
      tokens.push({ type: "plain", value: code[i] });
      i++;
      continue;
    }
    
    
    tokens.push({ type: "plain", value: code[i] });
    i++;
  }
  
  return tokens;
}

function getLineCount(code: string): number {
  return code.split("\n").length;
}

function CodeEditor({
  value,
  onChange,
  placeholder,
  onRun,
  running,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onRun: () => void;
  running: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbers = getLineCount(value);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="code-editor">
      <div className="editor-titlebar">
        <div className="editor-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="editor-title">qlang — REPL</span>
        <button className="editor-run-btn" onClick={onRun} disabled={running}>
          <Terminal size={13} />
          {running ? "Running..." : "Run"}
          <kbd className="run-shortcut">⌘↵</kbd>
        </button>
      </div>
      <div className="editor-body">
        <div className="line-numbers">
          {Array.from({ length: lineNumbers }, (_, i) => (
            <span key={i} className="line-number">{i + 1}</span>
          ))}
        </div>
        <div className="editor-content">
          <div className="highlight-layer">
            {value.split("\n").map((line, i) => (
              <div key={i} className="highlight-line">
                {line === "" && i === 0 && placeholder ? (
                  <span className="token-plain placeholder">{placeholder}</span>
                ) : (
                  tokenize(line).map((token, j) => (
                    <span key={j} className={`token-${token.type}`}>
                      {token.value}
                    </span>
                  ))
                )}
              </div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="editor-textarea"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}


const DOC_SECTIONS = [
  {
    id: "quick-start",
    title: "Quick Start",
    content: `Variables use qlang scripts for dynamic text generation. Use {{varname}} in your replacement text to reference a variable.`,
    example: { label: "Replacement text", code: 'Dear {{firstname}},\n\nToday is {{todaydate}}.\n\nBest regards' }
  },
  {
    id: "syntax",
    title: "Syntax",
    content: `qlang supports string literals, numbers, arithmetic, function calls, list indexing, and conditional expressions.`,
    example: { label: "Basic expression", code: '"Hello, " + upper(name) + "! Today is " + date("%B %d")' }
  }
];

const RUNNABLE_EXAMPLES = [
  {
    title: "Greeting",
    description: "Concatenate strings with uppercase conversion",
    code: '"Good morning, " + upper("world") + "!"',
    expected: "Good morning, WORLD!"
  },
  {
    title: "Date formatting",
    description: "Current date with custom format",
    code: 'today("%B %d, %Y")',
    expected: ""
  },
  {
    title: "Random choice",
    description: "Pick randomly from a list",
    code: '["yes", "no", "maybe"][rand(0, 2)]',
    expected: ""
  },
  {
    title: "String manipulation",
    description: "Replace and trim operations",
    code: 'trim(replace("  hello world  ", "world", "qlang"))',
    expected: "hello qlang"
  },
  {
    title: "Conditional",
    description: "If-else expression",
    code: 'let x = 15; if x > 10, "big", "small"',
    expected: "big"
  },
  {
    title: "List operations",
    description: "Split and join strings",
    code: 'split("apple,banana,cherry", ",")[1]',
    expected: "banana"
  }
];

const FUNCTION_CATEGORIES = [
  {
    category: "String",
    funcs: [
      { name: "upper(text)", desc: "Convert to uppercase" },
      { name: "lower(text)", desc: "Convert to lowercase" },
      { name: "trim(text)", desc: "Remove leading/trailing whitespace" },
      { name: "trim_start(text)", desc: "Remove leading whitespace" },
      { name: "trim_end(text)", desc: "Remove trailing whitespace" },
      { name: "len(text)", desc: "Get character count or list length" },
      { name: "repeat(text, n)", desc: "Repeat string n times" },
      { name: "replace(text, from, to)", desc: "Replace all occurrences" },
      { name: "slice(text, start, end)", desc: "Extract substring" },
      { name: "substr(text, start, len)", desc: "Extract substring by length" },
      { name: "split(text, delim)", desc: "Split into list" },
      { name: "contains(text, sub)", desc: "Check if contains substring" },
      { name: "starts_with(text, prefix)", desc: "Check prefix" },
      { name: "ends_with(text, suffix)", desc: "Check suffix" },
      { name: "reverse(text)", desc: "Reverse string" },
      { name: "title(text)", desc: "Title case" },
      { name: "pad_start(text, len, ch)", desc: "Pad left with character" },
      { name: "pad_end(text, len, ch)", desc: "Pad right with character" },
      { name: "concat(a, b, ...)", desc: "Concatenate values" },
    ],
  },
  {
    category: "Date & Time",
    funcs: [
      { name: "now(fmt)", desc: "Current date/time with format" },
      { name: "today(fmt)", desc: "Current date with format" },
      { name: "date_add(date, days)", desc: "Add/subtract days from date" },
      { name: "date_format(date, fmt)", desc: "Reformat date string" },
    ],
  },
  {
    category: "Numbers",
    funcs: [
      { name: "rand(lo, hi)", desc: "Random integer in range" },
      { name: "rand()", desc: "Random float 0-1" },
      { name: "to_num(text)", desc: "Convert to number" },
      { name: "floor(n)", desc: "Floor" },
      { name: "ceil(n)", desc: "Ceiling" },
      { name: "round(n)", desc: "Round" },
      { name: "abs(n)", desc: "Absolute value" },
      { name: "min(a, b, ...)", desc: "Minimum" },
      { name: "max(a, b, ...)", desc: "Maximum" },
      { name: "clamp(val, lo, hi)", desc: "Clamp to range" },
    ],
  },
  {
    category: "Lists",
    funcs: [
      { name: "[a, b, c]", desc: "Create a list literal" },
      { name: "list[n]", desc: "Index into list (0-based)" },
      { name: "len(list)", desc: "Get list length" },
      { name: "join(list, sep)", desc: "Join list into string" },
      { name: "first(list)", desc: "First element" },
      { name: "last(list)", desc: "Last element" },
      { name: "sort(list)", desc: "Sort list" },
    ],
  },
];

const ARGS_SECTION = {
  title: "Trigger Arguments",
  content: "You can pass arguments to triggers by typing them after the trigger text and ending with !. For example: ;join hello world!",
  examples: [
    {
      title: "First argument",
      desc: "Get the first argument",
      trigger: ";first hello world!",
      code: "args[0]",
      output: "hello"
    },
    {
      title: "Random argument",
      desc: "Pick a random argument",
      trigger: ";pick one two three!",
      code: "choice(args)",
      output: "two"
    },
    {
      title: "Join all arguments",
      desc: "Combine all arguments with spaces",
      trigger: ";join hello beautiful world!",
      code: "join(args, \" \")",
      output: "hello beautiful world"
    },
    {
      title: "First argument uppercase",
      desc: "Get and uppercase the first argument",
      trigger: ";cap hello!",
      code: "upper(args[0])",
      output: "HELLO"
    },
    {
      title: "Reverse arguments order",
      desc: "Reverse the list of arguments",
      trigger: ";rev one two three!",
      code: "sort(args) | reverse",
      output: "two, three, one"
    },
    {
      title: "Argument count",
      desc: "Get how many arguments were passed",
      trigger: ";count a b c d!",
      code: "\"You passed \" + len(args) + \" args\"",
      output: "You passed 4 args"
    },
    {
      title: "Conditional on args",
      desc: "Different output based on first argument",
      trigger: ";greet morning!",
      code: "if args[0] == \"morning\", \"Good morning!\", \"Good evening!\"",
      output: "Good morning!"
    }
  ]
};

export function ScriptLangView() {
  const [testCode, setTestCode] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testError, setTestError] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [exampleRunning, setExampleRunning] = useState<string | null>(null);

  async function runTest() {
    if (!testCode.trim()) return;
    try {
      setTestError("");
      setTestResult("");
      setRunning(true);
      const result = await invoke<string>("preview_script", { source: testCode });
      setTestResult(result);
    } catch (e: unknown) {
      setTestResult("");
      setTestError(e instanceof Error ? e.message : String(e));
    }
    setRunning(false);
  }

  async function runExample(code: string, id: string) {
    setExampleRunning(id);
    try {
      const result = await invoke<string>("preview_script", { source: code });
      setResults((prev) => ({ ...prev, [id]: result }));
    } catch {
      setResults((prev) => ({ ...prev, [id]: "error" }));
    }
    setExampleRunning(null);
  }

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const loadExample = useCallback((code: string) => {
    setTestCode(code);
    setTestResult("");
    setTestError("");
  }, []);

  return (
    <div className="view-container doc-view">
      <div className="view-header">
        <div>
          <h1>qlang Documentation</h1>
          <p className="view-subtitle">Custom scripting language for dynamic text generation</p>
        </div>
      </div>

      {/* Quick start sections */}
      {DOC_SECTIONS.map((section) => (
        <div key={section.id} className="doc-section">
          <h2 className="doc-section-title">{section.title}</h2>
          <p className="doc-text">{section.content}</p>
          <div className="code-block">
            <div className="code-block-header">
              <span className="code-label">{section.example.label}</span>
              <button className="copy-btn" onClick={() => copyCode(section.example.code)} title="Copy">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <div className="code-content">
              {section.example.code.split("\n").map((line, i) => (
                <div key={i}>
                  {tokenize(line).map((token, j) => (
                    <span key={j} className={`token-${token.type}`}>
                      {token.value}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Try it yourself — Code Editor */}
      <div className="doc-section">
        <h2 className="doc-section-title">Try it yourself</h2>
        <CodeEditor
          value={testCode}
          onChange={setTestCode}
          placeholder='Enter a qlang expression...'
          onRun={runTest}
          running={running}
        />
        {(testResult || testError) && (
          <div className={`editor-output ${testError ? "output-error" : ""}`}>
            <div className="output-header">
              <Terminal size={13} />
              <span>{testError ? "Error" : "Output"}</span>
              <button className="output-clear" onClick={() => { setTestResult(""); setTestError(""); }}>
                <X size={12} />
              </button>
            </div>
            <pre className="output-content">{testResult || testError}</pre>
          </div>
        )}
      </div>

      {/* Runnable examples */}
      <div className="doc-section">
        <h2 className="doc-section-title">Examples</h2>
        <p className="doc-text">Click run to execute, or click the code to load into the editor</p>
        <div className="examples-grid">
          {RUNNABLE_EXAMPLES.map((ex, i) => {
            const id = `example-${i}`;
            const result = results[id];
            return (
              <div key={i} className="example-card">
                <div className="example-card-header">
                  <h4>{ex.title}</h4>
                  <button
                    className="run-example-btn"
                    onClick={() => runExample(ex.code, id)}
                    disabled={exampleRunning === id}
                  >
                    <Play size={12} />
                    {exampleRunning === id ? "..." : "Run"}
                  </button>
                </div>
                <div className="example-code" onClick={() => loadExample(ex.code)} title="Click to load in editor">
                  {tokenize(ex.code).map((token, j) => (
                    <span key={j} className={`token-${token.type}`}>
                      {token.value}
                    </span>
                  ))}
                </div>
                <p className="example-desc">{ex.description}</p>
                {result && (
                  <div className="example-result">
                    <span className="result-label">→</span>
                    <code>{result}</code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Trigger Arguments */}
      <div className="doc-section">
        <h2 className="doc-section-title">{ARGS_SECTION.title}</h2>
        <p className="doc-text">{ARGS_SECTION.content}</p>
        <div className="code-block">
          <div className="code-block-header">
            <span className="code-label">How it works</span>
          </div>
          <div className="code-content">
            <span className="token-variable">;rand</span>
            <span className="token-plain"> one two three</span>
            <span className="token-keyword">!</span>{"\n"}
            {"\n"}
            <span className="token-function">args</span>
            <span className="token-bracket">[</span>
            <span className="token-function">rand</span>
            <span className="token-paren">(</span>
            <span className="token-number">0</span>
            <span className="token-operator">,</span>
            <span className="token-plain"> </span>
            <span className="token-function">len</span>
            <span className="token-paren">(</span>
            <span className="token-function">args</span>
            <span className="token-paren">)</span>
            <span className="token-plain"> </span>
            <span className="token-operator">-</span>
            <span className="token-plain"> </span>
            <span className="token-number">1</span>
            <span className="token-paren">)</span>
            <span className="token-bracket">]</span>
          </div>
        </div>

        <div className="args-examples-grid">
          {ARGS_SECTION.examples.map((ex, i) => (
            <div key={i} className="args-example-card">
              <div className="args-example-header">
                <h4>{ex.title}</h4>
                <span className="args-trigger">{ex.trigger}</span>
              </div>
              <p className="args-example-desc">{ex.desc}</p>
              <div className="args-example-code" onClick={() => loadExample(ex.code)} title="Click to load in editor">
                {tokenize(ex.code).map((token, j) => (
                  <span key={j} className={`token-${token.type}`}>
                    {token.value}
                  </span>
                ))}
              </div>
              <div className="args-example-output">
                <span className="output-arrow">→</span>
                <code>{ex.output}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Function reference */}
      {FUNCTION_CATEGORIES.map((section) => (
        <div key={section.category} className="doc-section">
          <h2 className="doc-section-title">{section.category}</h2>
          <div className="func-table">
            <div className="func-row func-row-header">
              <span>Function</span>
              <span>Description</span>
            </div>
            {section.funcs.map((fn) => (
              <div key={fn.name} className="func-row">
                <code className="func-name">{fn.name}</code>
                <span className="func-desc">{fn.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
