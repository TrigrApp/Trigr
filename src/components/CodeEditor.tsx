import { useRef } from "react";
import { Terminal, X } from "lucide-react";

type TokenType = "string" | "number" | "keyword" | "function" | "operator" | "paren" | "bracket" | "comment" | "variable" | "boolean" | "list" | "plain";

interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set(["let", "if", "then", "else", "match", "true", "false", "nil", "fn", "and", "or", "not"]);
const BUILTIN_FUNCTIONS = new Set([
  "upper", "lower", "trim", "trim_start", "trim_end", "len", "repeat",
  "replace", "slice", "substr", "split", "contains", "starts_with",
  "ends_with", "reverse", "title", "pad_start", "pad_end", "concat",
  "now", "today", "date_add", "date_format",
  "rand", "choice", "to_num", "floor", "ceil", "round", "abs", "min", "max", "clamp", "args",
  "join", "first", "last", "sort", "map", "filter",
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

    if (/[0-9]/.test(code[i]) && (i === 0 || /[\s([{,+\-*/%=<>!|]/.test(code[i - 1]))) {
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

export function getLineCount(code: string): number {
  return code.split("\n").length;
}

export function CodeEditor({
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
        <span className="editor-title">Trill — REPL</span>
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

export function EditorOutput({
  result,
  error,
  onClear,
}: {
  result: string;
  error: string;
  onClear: () => void;
}) {
  if (!result && !error) return null;
  return (
    <div className={`editor-output ${error ? "output-error" : ""}`}>
      <div className="output-header">
        <Terminal size={13} />
        <span>{error ? "Error" : "Output"}</span>
        <button className="output-clear" onClick={onClear}>
          <X size={12} />
        </button>
      </div>
      <pre className="output-content">{result || error}</pre>
    </div>
  );
}
