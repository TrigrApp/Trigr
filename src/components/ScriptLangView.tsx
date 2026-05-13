import { useState, useCallback, useRef, useEffect } from "react";
import { X, Search, Info, Braces, ArrowRight, GitBranch, Variable, Code2, BookOpen, Workflow, Copy, Check } from "lucide-react";
import { useStore } from "../store";
import { t } from "../i18n";
import { tokenize } from "./CodeEditor";

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
    content: "Variables bind names to values using let. A let expression has three parts: the name, the value, and a body expression where the name is available. Everything in Trill is an expression \u2014 let returns the value of its body, making it fundamentally different from imperative variable declarations.",
    note: "Unlike many languages, there's no semicolon needed after the value expression. The body follows naturally on the next line. Assignment (=) desugars to a let with the assigned name as the body.",
    cards: [
      { label: "Basic binding", icon: <Variable size={13} />, tip: "Bind a value, then use it in the body", code: 'let name = "Juliette"\nlet age = 17\nname' },
      { label: "Let scope", icon: <Braces size={13} />, tip: "The binding is only visible in the body", code: "let x = 5\nx + 3" },
      { label: "Assignment", icon: <ArrowRight size={13} />, tip: "Reassignment creates a new let binding", code: 'let name = "hello"\nname = "world"\nname' },
    ]
  },
  {
    id: "literals",
    title: "Literals",
    icon: <Code2 size={16} />,
    content: "Literals are the atomic building blocks of Trill expressions \u2014 values written directly in source code. Every literal is itself an expression that evaluates to its own value. Numbers, strings, booleans, and nil cover the primitive types. These combine with operators and functions to form all larger expressions.",
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
    content: "If is an expression \u2014 it always produces a value. The condition goes before then, the true branch follows, and an optional else provides the false branch. Chain else if for multiple conditions. Every branch is a full expression that can span multiple lines.",
    note: "Every if must have a then branch. The else branch is optional \u2014 without it, a false condition evaluates to nil. Unlike C-family languages, there are no curly braces \u2014 indentation is optional and newlines separate branches.",
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
      { label: "Access by index", icon: <Braces size={13} />, tip: "Zero-based position", code: "let nums = [10, 20, 30]\nnums[0]" },
      { label: "Negative index", icon: <Braces size={13} />, tip: "-1 is last, -2 is second-to-last", code: "[1, 2, 3][-1]" },
    ]
  },
  {
    id: "objects",
    title: "Objects",
    icon: <Braces size={16} />,
    content: "Objects are key-value maps with string keys and any-typed values. Create them with curly braces and key: value pairs separated by commas. Access fields via dot notation \u2014 the field name must be a valid identifier (no quotes needed). Objects nest arbitrarily for structured data.",
    note: "Field names are identifiers (no quotes). Dot access returns nil for missing keys. Bracket indexing with string keys also works and is equivalent to dot access.",
    cards: [
      { label: "Create", icon: <Braces size={13} />, tip: "Comma-separated key: value pairs", code: "{\n  name: \"Sal\",\n  age: 20\n}" },
      { label: "Dot access", icon: <ArrowRight size={13} />, tip: "Read a field by name", code: 'let user = { name: "Sal", age: 20 }\nuser.name' },
      { label: "Nested", icon: <ArrowRight size={13} />, tip: "Chain dots for nested data", code: 'let data = { profile: { username: "sal" } }\ndata.profile.username' },
    ]
  },
  {
    id: "functions",
    title: "Function Calls",
    icon: <Code2 size={16} />,
    content: "Trill provides a rich standard library of built-in functions for string processing, date/time formatting, math, and list operations. Call any function with the standard name(args) syntax. Functions are expressions \u2014 they always return a value and can be composed freely.",
    note: "All built-in functions return values; there are no procedures or void functions. Functions can be called in pipes using |, which passes the left value as the first argument.",
    cards: [
      { label: "String ops", icon: <Code2 size={13} />, tip: "Transform and inspect text", code: 'upper("hello")\nlen("hello")\nsplit("a,b,c", ",")' },
      { label: "Date/time", icon: <Code2 size={13} />, tip: "Format dates with strftime", code: 'now("%Y-%m-%d")\ntoday("%B %d, %Y")' },
      { label: "Math", icon: <Code2 size={13} />, tip: "Rounding, random, and more", code: "round(3.7)\nrand(1, 100)" },
      { label: "List ops", icon: <Code2 size={13} />, tip: "Transform collections", code: "sort([3, 1, 2])\nfirst([10, 20, 30])" },
    ]
  },
  {
    id: "lambdas",
    title: "Lambdas",
    icon: <ArrowRight size={16} />,
    content: "Lambdas are anonymous function values created with the => arrow syntax. A single parameter is written without parentheses (x => ...). Multiple parameters require parentheses around the parameter list: (a, b) => .... The expression after => is the function body, evaluated when the lambda is called.",
    note: "Lambdas capture variables from the enclosing scope by name at call time \u2014 they're not closures capturing variable bindings. Use lambdas as arguments to map, filter, and other higher-order functions.",
    cards: [
      { label: "Single param", icon: <ArrowRight size={13} />, tip: "Write param then => and body", code: "x => x * 2" },
      { label: "Multiple params", icon: <ArrowRight size={13} />, tip: "Wrap params in parentheses", code: "(a, b) => a + b" },
      { label: "With pipes", icon: <Workflow size={13} />, tip: "Lambdas power data pipelines", code: "[1, 2, 3] | map(x => x * 2)" },
    ]
  },
  {
    id: "pipes",
    title: "Pipes",
    icon: <Workflow size={16} />,
    content: "The pipe operator (|) threads a value through a function call, passing it as the first argument. This lets you build left-to-right data pipelines where each transformation feeds into the next. Pipes compose naturally with lambdas for inline transformations.",
    note: "The right side of a pipe must be a function call (name(args)). Each step returns a new value that becomes the input to the next step. Pipes evaluate eagerly \u2014 there's no lazy streaming.",
    cards: [
      { label: "Basic pipe", icon: <Workflow size={13} />, tip: "Pass left value as first arg", code: "5 | to_str | upper" },
      { label: "Data pipeline", icon: <Workflow size={13} />, tip: "Chain transforms left to right", code: '[1, 2, 3] | filter(x => x > 1) | map(x => x * 10) | join_list(", ")' },
    ]
  },
  {
    id: "pattern-matching",
    title: "Pattern Matching",
    icon: <GitBranch size={16} />,
    content: "Match expressions destructure values by pattern: the value is compared against each arm's pattern in order, and the first match executes its corresponding expression. The underscore (_) acts as a catch-all default, matching any value. Arms are separated by commas.",
    note: "Patterns must be literal values \u2014 numbers, strings, booleans, or nil. Variables cannot be used as patterns. If no arm matches and there's no default, the match evaluates to nil.",
    cards: [
      { label: "String match", icon: <GitBranch size={13} />, tip: "Match string literals", code: 'let status = "success"\nmatch status {\n  "success" => "green",\n  "warning" => "yellow",\n  "error" => "red",\n  _ => "gray"\n}' },
      { label: "Number match", icon: <GitBranch size={13} />, tip: "Match numeric literals", code: 'match 2 {\n  1 => "one",\n  2 => "two",\n  3 => "three",\n  _ => "many"\n}' },
    ]
  },
];

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

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [code]);

  return (
    <div className="doc-code-block">
      <button className={`copy-code-btn${copied ? " copied" : ""}`} onClick={handleCopy}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
      {code.split("\n").map((line, i) => (
        <div key={i} className="doc-code-line">
          {tokenize(line).map((token, j) => (
            <span key={j} className={`token-${token.type}`}>{token.value}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

const SECTION_IDS = DOC_SECTIONS.map((s) => s.id);
const TOC_ITEMS = DOC_SECTIONS.map((s) => ({ id: s.id, label: s.title, icon: s.icon }));

export function ScriptLangView() {
  const lang = useStore((s) => s.settings.language);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState(SECTION_IDS[0] || "");
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
              <span className="toc-icon">{item.icon}</span>
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
                  <div key={i} className="doc-card">
                    <div className="doc-card-header">
                      <span className="doc-card-icon">{card.icon}</span>
                      <span className="doc-card-label">{card.label}</span>
                      <InfoTip text={card.tip} />
                    </div>
                    <CodeBlock code={card.code} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
