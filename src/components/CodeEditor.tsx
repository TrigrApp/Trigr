import { useRef, useCallback } from "react";

type TokenType =
  | "string"
  | "number"
  | "keyword"
  | "function"
  | "operator"
  | "paren"
  | "bracket"
  | "comment"
  | "variable"
  | "boolean"
  | "list"
  | "plain";

interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  "let",
  "if",
  "then",
  "else",
  "match",
  "true",
  "false",
  "nil",
  "fn",
  "and",
  "or",
  "not",
]);
const BUILTIN_FUNCTIONS = new Set([
  "upper",
  "lower",
  "trim",
  "trim_start",
  "trim_end",
  "len",
  "repeat",
  "replace",
  "slice",
  "substr",
  "split",
  "contains",
  "starts_with",
  "ends_with",
  "reverse",
  "title",
  "pad_start",
  "pad_end",
  "concat",
  "now",
  "today",
  "date_add",
  "date_format",
  "rand",
  "choice",
  "to_num",
  "floor",
  "ceil",
  "round",
  "abs",
  "min",
  "max",
  "clamp",
  "args",
  "join",
  "first",
  "last",
  "sort",
  "map",
  "filter",
  "join_list",
  "to_str",
  "string",
  "number",
  "list",
  "length",
  "ceiling",
  "random",
]);

export function tokenize(code: string): Token[] {
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

    if (
      /[0-9]/.test(code[i]) &&
      (i === 0 || /[\s([{,+\-*/%=<>!|]/.test(code[i - 1]))
    ) {
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

    if ("+-*/%=<>".includes(code[i])) {
      if (code[i] === "=" && code[i + 1] === ">") {
        tokens.push({ type: "operator", value: "=>" });
        i += 2;
        continue;
      }
      if (code[i] === "-" && code[i + 1] === ">") {
        tokens.push({ type: "operator", value: "->" });
        i += 2;
        continue;
      }
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

    if (code[i] === "{" || code[i] === "}") {
      tokens.push({ type: "bracket", value: code[i] });
      i++;
      continue;
    }

    if (code[i] === ",") {
      tokens.push({ type: "operator", value: code[i] });
      i++;
      continue;
    }

    if (code[i] === "|") {
      tokens.push({ type: "operator", value: "|" });
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightCode(code: string): string {
  const tokens = tokenize(code);
  let out = "";
  for (const t of tokens) {
    const val = escapeHtml(t.value);
    if (t.type === "plain") {
      out += val;
    } else {
      out += `<span class="token-${t.type}">${val}</span>`;
    }
  }
  return out;
}

export function CodeEditor({
  value,
  onChange,
  placeholder,
  onRun,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onRun: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const valueRef = useRef(value);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  valueRef.current = value;

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const cur = valueRef.current;
        const next = cur.slice(0, start) + "  " + cur.slice(end);
        onChangeRef.current(next);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
        return;
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onRunRef.current();
      }
    },
    [],
  );

  const lines = value.split("\n");

  const highlighted = highlightCode(value) || "\n";

  return (
    <div className="code-editor">
      <div className="code-editor-inner">
        <div ref={gutterRef} className="code-gutter">
          {lines.map((_, i) => (
            <div key={i} className="code-gutter-line">
              {i + 1}
            </div>
          ))}
        </div>
        <div className="code-editor-body">
          <pre
            ref={preRef}
            className="code-highlight"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={value}
            onChange={(e) => onChangeRef.current(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            onClick={syncScroll}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
          />
        </div>
      </div>
    </div>
  );
}
