import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Terminal, X, Search, Info, Braces, ArrowRight, GitBranch, Variable, Code2, BookOpen, Workflow } from "lucide-react";
import { useStore } from "../store";
import { t } from "../i18n";
import { CodeEditor, tokenize } from "./CodeEditor";

interface DocCard {
  label: string;
  icon: React.ReactNode;
  tip: string;
  code: string;
}

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  cards?: DocCard[];
  note?: string;
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: "variables",
    title: "Variables",
    icon: <Variable size={16} />,
    content: "Variables bind names to values using let. A let expression has three parts: the name, the value, and a body expression where the name is available. Everything in Trill is an expression — let returns the value of its body, making it fundamentally different from imperative variable declarations.",
    note: "Unlike many languages, there's no semicolon needed after the value expression. The body follows naturally on the next line. Assignment (=) desugars to a let with the assigned name as the body.",
    cards: [
      { label: "Basic binding", icon: <Variable size={13} />, tip: "Bind a value, then use it in the body", code: 'let name = "Juliette"\nlet age = 17\nname' },
      { label: "Let scope", icon: <Braces size={13} />, tip: "The binding is only visible in the body", code: 'let x = 5\nx + 3' },
      { label: "Assignment", icon: <ArrowRight size={13} />, tip: "Reassignment creates a new let binding", code: 'let name = "hello"\nname = "world"\nname' },
    ]
  },
  {
    id: "literals",
    title: "Literals",
    icon: <Code2 size={16} />,
    content: "Literals are the atomic building blocks of Trill expressions — values written directly in source code. Every literal is itself an expression that evaluates to its own value. Numbers, strings, booleans, and nil cover the primitive types. These combine with operators and functions to form all larger expressions.",
    cards: [
      { label: "Numbers", icon: <Code2 size={13} />, tip: "Integers and floating-point share the numeric type", code: "42\n3.14\n-7" },
      { label: "Strings", icon: <Code2 size={13} />, tip: "Double-quoted with escape sequences", code: '"hello"\n"line 1\\nline 2"\n"he said \\"hi\\""' },
      { label: "Booleans", icon: <Code2 size={13} />, tip: "true and false, used in conditions", code: "true\nfalse" },
      { label: "Null", icon: <Code2 size={13} />, tip: "nil represents absence of a value", code: "nil" },
    ]
  },
  {
    id: "operators",
    title: "Operators",
    icon: <Code2 size={16} />,
    content: "Operators follow standard precedence: unary not and negation bind tightest, then */%, then +-, then comparisons, then equality, then and/or. Parentheses override any precedence. The + operator performs both numeric addition and string concatenation depending on operand types.",
    cards: [
      { label: "Arithmetic", icon: <Code2 size={13} />, tip: "Standard math with correct precedence", code: "1 + 2 * 3\n10 / 2\n100 % 30" },
      { label: "Comparison", icon: <Code2 size={13} />, tip: "Returns true or false", code: "5 > 3\n10 == 10\n7 != 3" },
      { label: "String concat", icon: <Code2 size={13} />, tip: "+ joins strings or mixes with numbers", code: '"Hello, " + "World!"\n"Age: " + 30' },
      { label: "Logic", icon: <Code2 size={13} />, tip: "and, or, not with short-circuit", code: "true and false\nnot (5 > 10)\nfalse or true" },
    ]
  },
  {
    id: "if",
    title: "If Expressions",
    icon: <GitBranch size={16} />,
    content: "If is an expression — it always produces a value. The condition goes before then, the true branch follows, and an optional else provides the false branch. Chain else if for multiple conditions. Every branch is a full expression that can span multiple lines.",
    note: "Every if must have a then branch. The else branch is optional — without it, a false condition evaluates to nil. Unlike C-family languages, there are no curly braces — indentation is optional and newlines separate branches.",
    cards: [
      { label: "Basic if", icon: <GitBranch size={13} />, tip: "Returns the then or else value", code: 'if 5 > 3 then "yes" else "no"' },
      { label: "Chained", icon: <GitBranch size={13} />, tip: "else if chains multiple conditions", code: 'let score = 85\nif score > 90 then\n  "A"\nelse if score > 80 then\n  "B"\nelse\n  "C"' },
      { label: "No else", icon: <GitBranch size={13} />, tip: "Without else, false returns nil", code: 'let x = 5\nif x > 10 then "big"' },
    ]
  },
  {
    id: "arrays",
    title: "Arrays",
    icon: <Braces size={16} />,
    content: "Arrays are ordered, zero-indexed collections of values enclosed in square brackets. Elements can be of mixed types. Access elements by position using bracket notation; negative indices count from the end of the array (-1 is the last element).",
    note: "Indexing is 0-based. A negative index n accesses the element at length + n, so -1 gives the last element and -2 the second-to-last. Out-of-bounds access returns an error.",
    cards: [
      { label: "Create", icon: <Braces size={13} />, tip: "Comma-separated values in brackets", code: '[1, 2, 3]\n["a", "b", "c"]' },
      { label: "Access by index", icon: <Braces size={13} />, tip: "Zero-based position", code: 'let nums = [10, 20, 30]\nnums[0]' },
      { label: "Negative index", icon: <Braces size={13} />, tip: "-1 is last, -2 is second-to-last", code: '[1, 2, 3][-1]' },
    ]
  },
  {
    id: "objects",
    title: "Objects",
    icon: <Braces size={16} />,
    content: "Objects are key-value maps with string keys and any-typed values. Create them with curly braces and key: value pairs separated by commas. Access fields via dot notation — the field name must be a valid identifier (no quotes needed). Objects nest arbitrarily for structured data.",
    note: "Field names are identifiers (no quotes). Dot access returns nil for missing keys. Bracket indexing with string keys also works and is equivalent to dot access.",
    cards: [
      { label: "Create", icon: <Braces size={13} />, tip: "Comma-separated key: value pairs", code: '{\n  name: "Sal",\n  age: 20\n}' },
      { label: "Dot access", icon: <ArrowRight size={13} />, tip: "Read a field by name", code: 'let user = { name: "Sal", age: 20 }\nuser.name' },
      { label: "Nested", icon: <ArrowRight size={13} />, tip: "Chain dots for nested data", code: 'let data = { profile: { username: "sal" } }\ndata.profile.username' },
    ]
  },
  {
    id: "functions",
    title: "Function Calls",
    icon: <Code2 size={16} />,
    content: "Trill provides a rich standard library of built-in functions for string processing, date/time formatting, math, and list operations. Call any function with the standard name(args) syntax. Functions are expressions — they always return a value and can be composed freely.",
    note: "All built-in functions return values; there are no procedures or void functions. Functions can be called in pipes using |, which passes the left value as the first argument.",
    cards: [
      { label: "String ops", icon: <Code2 size={13} />, tip: "Transform and inspect text", code: 'upper("hello")\nlen("hello")\nsplit("a,b,c", ",")' },
      { label: "Date/time", icon: <Code2 size={13} />, tip: "Format dates with strftime", code: 'now("%Y-%m-%d")\ntoday("%B %d, %Y")' },
      { label: "Math", icon: <Code2 size={13} />, tip: "Rounding, random, and more", code: 'round(3.7)\nrand(1, 100)' },
      { label: "List ops", icon: <Code2 size={13} />, tip: "Transform collections", code: 'sort([3, 1, 2])\nfirst([10, 20, 30])' },
    ]
  },
  {
    id: "lambdas",
    title: "Lambdas",
    icon: <ArrowRight size={16} />,
    content: "Lambdas are anonymous function values created with the => arrow syntax. A single parameter is written without parentheses (x => ...). Multiple parameters require parentheses around the parameter list: (a, b) => .... The expression after => is the function body, evaluated when the lambda is called.",
    note: "Lambdas capture variables from the enclosing scope by name at call time — they're not closures capturing variable bindings. Use lambdas as arguments to map, filter, and other higher-order functions.",
    cards: [
      { label: "Single param", icon: <ArrowRight size={13} />, tip: "Write param then => and body", code: 'x => x * 2' },
      { label: "Multiple params", icon: <ArrowRight size={13} />, tip: "Wrap params in parentheses", code: '(a, b) => a + b' },
      { label: "With pipes", icon: <Workflow size={13} />, tip: "Lambdas power data pipelines", code: '[1, 2, 3] | map(x => x * 2)' },
    ]
  },
  {
    id: "pipes",
    title: "Pipes",
    icon: <Workflow size={16} />,
    content: "The pipe operator (|) threads a value through a function call, passing it as the first argument. This lets you build left-to-right data pipelines where each transformation feeds into the next. Pipes compose naturally with lambdas for inline transformations.",
    note: "The right side of a pipe must be a function call (name(args)). Each step returns a new value that becomes the input to the next step. Pipes evaluate eagerly — there's no lazy streaming.",
    cards: [
      { label: "Basic pipe", icon: <Workflow size={13} />, tip: "Pass left value as first arg", code: '5 | to_str | upper' },
      { label: "Data pipeline", icon: <Workflow size={13} />, tip: "Chain transforms left to right", code: '[1, 2, 3] | filter(x => x > 1) | map(x => x * 10) | join_list(", ")' },
    ]
  },
  {
    id: "pattern-matching",
    title: "Pattern Matching",
    icon: <GitBranch size={16} />,
    content: "Match expressions destructure values by pattern: the value is compared against each arm's pattern in order, and the first match executes its corresponding expression. The underscore (_) acts as a catch-all default, matching any value. Arms are separated by commas.",
    note: "Patterns must be literal values — numbers, strings, booleans, or nil. Variables cannot be used as patterns. If no arm matches and there's no default, the match evaluates to nil.",
    cards: [
      { label: "String match", icon: <GitBranch size={13} />, tip: "Match string literals", code: 'let status = "success"\nmatch status {\n  "success" => "green",\n  "warning" => "yellow",\n  "error" => "red",\n  _ => "gray"\n}' },
      { label: "Number match", icon: <GitBranch size={13} />, tip: "Match numeric literals", code: 'match 2 {\n  1 => "one",\n  2 => "two",\n  3 => "three",\n  _ => "many"\n}' },
    ]
  },
];

const RUNNABLE_EXAMPLES = [
  {
    title: "Greeting",
    description: "Time-based greeting using if and now()",
    code: 'let hour = to_num(now("%H"))\nif hour < 12 then\n  "Good morning"\nelse if hour < 18 then\n  "Good afternoon"\nelse\n  "Good evening"',
  },
  {
    title: "Date formatting",
    description: "Current date with custom format",
    code: 'today("%B %d, %Y")',
  },
  {
    title: "Random choice",
    description: "Pick randomly from a list",
    code: 'choice(["yes", "no", "maybe"])',
  },
  {
    title: "String manipulation",
    description: "Replace and trim operations",
    code: 'trim(replace("  hello world  ", "world", "Trill"))',
  },
  {
    title: "Conditional",
    description: "If-else with a comparison",
    code: 'let x = 15\nif x > 10 then "big" else "small"',
  },
  {
    title: "List pipeline",
    description: "Filter, map, and join with pipes",
    code: '[1, 2, 3, 4, 5]\n| filter(x => x > 2)\n| map(x => x * 10)\n| join_list(", ")',
  },
  {
    title: "Pattern match",
    description: "Match on a value",
    code: 'let color = match 2 {\n  1 => "red",\n  2 => "blue",\n  3 => "green",\n  _ => "unknown"\n}\n"Selected: " + color',
  },
  {
    title: "Object access",
    description: "Create an object and read a field",
    code: 'let user = { name: "Alice", age: 30 }\nuser.name',
  },
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
      { name: "slice(text, start, end)", desc: "Extract substring range" },
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
      { name: "now(fmt)", desc: "Current date/time with strftime format" },
      { name: "today(fmt)", desc: "Current date with strftime format" },
      { name: "date_add(date, days)", desc: "Add/subtract days from date" },
      { name: "date_format(date, fmt)", desc: "Reformat date string" },
    ],
  },
  {
    category: "Numbers",
    funcs: [
      { name: "rand(lo, hi)", desc: "Random integer in range" },
      { name: "rand()", desc: "Random float 0-1" },
      { name: "choice(items)", desc: "Pick random element from list" },
      { name: "to_num(text)", desc: "Convert string to number" },
      { name: "floor(n)", desc: "Round down" },
      { name: "ceil(n)", desc: "Round up" },
      { name: "round(n)", desc: "Round to nearest" },
      { name: "abs(n)", desc: "Absolute value" },
      { name: "min(a, b, ...)", desc: "Minimum value" },
      { name: "max(a, b, ...)", desc: "Maximum value" },
      { name: "clamp(val, lo, hi)", desc: "Clamp value to range" },
    ],
  },
  {
    category: "Lists",
    funcs: [
      { name: "[a, b, c]", desc: "List literal" },
      { name: "list[n]", desc: "Index into list (0-based)" },
      { name: "len(list)", desc: "Get list length" },
      { name: "join(list, sep)", desc: "Join list into string" },
      { name: "join_list(list, sep)", desc: "Join list with separator" },
      { name: "first(list)", desc: "First element" },
      { name: "last(list)", desc: "Last element" },
      { name: "sort(list)", desc: "Sort list ascending" },
    ],
  },
  {
    category: "Data Pipeline",
    funcs: [
      { name: "list | func", desc: "Pipe: pass list into next function" },
      { name: "map(list, fn)", desc: "Transform each element" },
      { name: "filter(list, fn)", desc: "Keep elements where fn returns true" },
      { name: "sort(list)", desc: "Sort elements" },
    ],
  },
  {
    category: "Conversion",
    funcs: [
      { name: "to_num(text)", desc: "Convert text to number" },
      { name: "to_str(value)", desc: "Convert any value to string" },
      { name: "string(value)", desc: "Alias for to_str" },
    ],
  },
];

const ARGS_SECTION = {
  title: "Trigger Arguments",
  subtitle: "Your triggers can accept typed arguments using the args variable",
  content: "When a trigger has args mode enabled, type text after the trigger and end with !. The words are passed as the args list.",
  note: "Args are always strings. Use to_num() to convert numeric args.",
  examples: [
    {
      title: "First argument",
      desc: "Get the first typed argument",
      trigger: ";first hello world!",
      code: 'args[0]',
      output: "hello"
    },
    {
      title: "Random argument",
      desc: "Pick a random argument",
      trigger: ";pick one two three!",
      code: 'choice(args)',
      output: "two"
    },
    {
      title: "Join all arguments",
      desc: "Combine all arguments with separator",
      trigger: ";join hello beautiful world!",
      code: 'join(args, " ")',
      output: "hello beautiful world"
    },
    {
      title: "Uppercase first",
      desc: "Get and uppercase the first argument",
      trigger: ";cap hello!",
      code: 'upper(args[0])',
      output: "HELLO"
    },
    {
      title: "Argument count",
      desc: "Show how many arguments were passed",
      trigger: ";count a b c d!",
      code: '"You passed " + len(args) + " args"',
      output: "You passed 4 args"
    },
    {
      title: "Conditional on args",
      desc: "Different output based on first argument",
      trigger: ";greet morning!",
      code: 'if args[0] == "morning" then "Good morning!" else "Good evening!"',
      output: "Good morning!"
    },
    {
      title: "Number argument",
      desc: "Convert and use a numeric argument",
      trigger: ";double 21!",
      code: 'to_num(args[0]) * 2',
      output: "42"
    },
  ]
};

function sanitizeId(s: string): string {
  return s.toLowerCase().replace(/[\s&]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

const SECTION_IDS = DOC_SECTIONS.map((s) => s.id);
const TOC_ITEMS = DOC_SECTIONS.map((s) => ({ id: s.id, label: s.title }));

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="info-tip-wrapper">
      <span
        className="info-tip-icon"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <Info size={13} />
      </span>
      <span className={`info-tip-bubble${show ? " visible" : ""}`}>{text}</span>
    </span>
  );
}

export function ScriptLangView() {
  const lang = useStore((s) => s.settings.language);
  const [testCode, setTestCode] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testError, setTestError] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [exampleRunning, setExampleRunning] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(SECTION_IDS[0] || "");
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const filteredToc = TOC_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const scrollContainer = document.querySelector(".main-content");
    if (!scrollContainer) return;

    function updateActive() {
      let bestId = SECTION_IDS[0];
      let bestDist = Infinity;
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const dist = Math.abs(el.getBoundingClientRect().top);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = id;
        }
      }
      setActiveSection((prev) => (prev !== bestId ? bestId : prev));
    }

    updateActive();
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActive();
          ticking = false;
        });
        ticking = true;
      }
    };
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const section = contentRef.current?.querySelector(`#${id}`);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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

  const loadExample = useCallback((code: string) => {
    setTestCode(code);
    setTestResult("");
    setTestError("");
    const tryIt = contentRef.current?.querySelector("#try-it");
    if (tryIt) tryIt.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="doc-layout">
      <aside className="doc-sidebar">
        <div className="doc-sidebar-header">
          <BookOpen size={13} />
          <span>Contents</span>
        </div>
        <div className="doc-search">
          <Search size={14} className="doc-search-icon" />
          <input
            type="text"
            className="doc-search-input"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="doc-search-clear" onClick={() => setSearchQuery("")}>
              <X size={12} />
            </button>
          )}
        </div>
        <nav className="doc-toc">
          {filteredToc.map((item) => (
            <button
              key={item.id}
              className={`doc-toc-item ${activeSection === item.id ? "active" : ""}`}
              onClick={() => scrollToSection(item.id)}
            >
              {item.label}
            </button>
          ))}
          {filteredToc.length === 0 && (
            <span className="doc-toc-empty">No results</span>
          )}
        </nav>
      </aside>
      <main className="doc-main" ref={contentRef}>
        <div className="view-header">
          <h1>{t("script.title", lang)}</h1>
          <p className="view-subtitle">{t("script.subtitle", lang)}</p>
        </div>

        {DOC_SECTIONS.map((section) => (
          <div key={section.id} id={section.id} className="doc-section">
            <h2 className="doc-section-title">
              <span className="section-title-icon">{section.icon}</span>
              {section.title}
            </h2>
            <p className="doc-text">
              {section.content}
              {section.note && <InfoTip text={section.note} />}
            </p>
            {section.cards && (
              <div className="doc-cards">
                {section.cards.map((card, i) => (
                  <div key={i} className="doc-card" onClick={() => loadExample(card.code)} title="Click to load into editor">
                    <div className="doc-card-header">
                      <span className="doc-card-icon">{card.icon}</span>
                      <span className="doc-card-label">{card.label}</span>
                      <InfoTip text={card.tip} />
                    </div>
                    <div className="code-content doc-card-code">
                      {card.code.split("\n").map((line, j) => (
                        <div key={j}>
                          {tokenize(line).map((token, k) => (
                            <span key={k} className={`token-${token.type}`}>
                              {token.value}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div id="try-it" className="doc-section">
          <h2 className="doc-section-title">
            <span className="section-title-icon"><Terminal size={16} /></span>
            Try It Yourself
          </h2>
          <p className="doc-text">
            Write any Trill expression, script, or pipeline below. Press Run or <kbd className="inline-kbd">⌘Enter</kbd> to evaluate.
          </p>
          <CodeEditor
            value={testCode}
            onChange={setTestCode}
            placeholder={"Enter a Trill expression...\ne.g. upper(\"hello\")"}
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

        <div id="examples" className="doc-section">
          <h2 className="doc-section-title">
            <span className="section-title-icon"><Play size={16} /></span>
            Examples
          </h2>
          <p className="doc-text">Click <strong>Run</strong> to execute, or click the code to load it into the editor.</p>
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
                    {ex.code.split("\n").map((line, j) => (
                      <div key={j}>
                        {tokenize(line).map((token, k) => (
                          <span key={k} className={`token-${token.type}`}>
                            {token.value}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className="example-desc">{ex.description}</p>
                  {result && (
                    <div className="example-result">
                      <span className="result-label">→</span>
                      <code>{result}</code>
                    </div>
                  )}
                  {result === "error" && (
                    <div className="example-result result-error">
                      <span className="result-label">→</span>
                      <code>Error</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div id="trigger-args" className="doc-section">
          <h2 className="doc-section-title">
            <span className="section-title-icon"><Terminal size={16} /></span>
            {ARGS_SECTION.title}
          </h2>
          <p className="doc-text">
            {ARGS_SECTION.content}
            <InfoTip text={ARGS_SECTION.note || ""} />
          </p>

          <div className="code-block">
            <div className="code-block-header">
              <span className="code-label">How it works</span>
            </div>
            <div className="code-content">
              <span className="token-comment">// Type this in any app:</span>{"\n"}
              <span className="token-variable">;greet</span>
              <span className="token-plain"> Alice!</span>{"\n\n"}
              <span className="token-comment">// The script receives ['Alice'] as args:</span>{"\n"}
              <span className="token-keyword">if</span>
              <span className="token-plain"> </span>
              <span className="token-function">len</span>
              <span className="token-paren">(</span>
              <span className="token-variable">args</span>
              <span className="token-paren">)</span>
              <span className="token-plain"> </span>
               <span className="token-operator">{">"}</span>
              <span className="token-plain"> </span>
              <span className="token-number">0</span>
              <span className="token-plain"> </span>
              <span className="token-keyword">then</span>
              <span className="token-plain"> </span>
              <span className="token-string">"Hello, "</span>
              <span className="token-plain"> </span>
              <span className="token-operator">+</span>
              <span className="token-plain"> </span>
              <span className="token-variable">args</span>
              <span className="token-bracket">[</span>
              <span className="token-number">0</span>
              <span className="token-bracket">]</span>
              <span className="token-plain"> </span>
              <span className="token-keyword">else</span>
              <span className="token-plain"> </span>
              <span className="token-string">"Hello, world"</span>
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

        {FUNCTION_CATEGORIES.map((section) => (
          <div key={section.category} id={`func-${sanitizeId(section.category)}`} className="doc-section">
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
      </main>
    </div>
  );
}
