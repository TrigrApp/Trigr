import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Terminal, BookOpen, ChevronDown, ChevronRight, Clock, Copy, Check, Play, Plus, X, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { CodeEditor } from "./CodeEditor";

const QUICK_EXAMPLES = [
  { name: "Hello", code: 'upper("hello world")' },
  { name: "Date", code: 'today("%B %d, %Y")' },
  { name: "Random", code: "rand(1, 100)" },
  { name: "If", code: 'let x = 15\nif x > 10 then "big" else "small"' },
  { name: "Pipe", code: "[1, 2, 3, 4, 5]\n| filter(x => x > 2)\n| map(x => x * 10)\n| join_list(\", \")" },
  { name: "Match", code: 'let n = 2\nmatch n {\n  1 => "one",\n  2 => "two",\n  _ => "many"\n}' },
  { name: "Object", code: 'let user = { name: "Alice", age: 30 }\nuser.name' },
  { name: "Args", code: 'if len(args) > 0 then args[0] else "no args"' },
];

const RECENT_STORAGE_KEY = "trill_recent_scripts";

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(scripts: string[]) {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(scripts.slice(0, 20)));
  } catch {}
}

export function ScriptRunner() {
  const setView = useStore((s) => s.setView);
  const [code, setCode] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [scriptArgs, setScriptArgs] = useState<string[]>([""]);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [showRecent, setShowRecent] = useState(true);
  const [copied, setCopied] = useState(false);

  const hasResult = !!result;
  const hasError = !!error;

  async function run() {
    if (!code.trim()) return;
    try {
      setError("");
      setResult("");
      setRunning(true);
      const filtered = scriptArgs.filter((a) => a.trim());
      const res = await invoke<string>("preview_script", { source: code, args: filtered });
      setResult(res);
      const updated = [code, ...recent.filter((s) => s !== code)];
      setRecent(updated);
      saveRecent(updated);
    } catch (e: unknown) {
      setResult("");
      setError(e instanceof Error ? e.message : String(e));
    }
    setRunning(false);
  }

  function loadCode(c: string) {
    setCode(c);
    setResult("");
    setError("");
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function addArg() {
    setScriptArgs([...scriptArgs, ""]);
  }

  function updateArg(i: number, val: string) {
    const next = [...scriptArgs];
    next[i] = val;
    setScriptArgs(next);
  }

  function removeArg(i: number) {
    setScriptArgs(scriptArgs.filter((_, idx) => idx !== i));
  }

  function clearRecent() {
    setRecent([]);
    saveRecent([]);
  }

  return (
    <div className="view-container runner-page">
      <div className="view-header view-header-row">
        <div className="view-header-text">
          <h1>
            <Terminal size={22} />
            Script Runner
          </h1>
          <p className="view-subtitle">Test and experiment with Trill expressions in real time</p>
        </div>
        <div className="view-header-actions">
          <button className="btn-primary" onClick={run} disabled={running}>
            <Play size={14} />
            {running ? "Running..." : "Run"}
            <kbd className="shortcut-hint">⌘↵</kbd>
          </button>
          <button className="btn-secondary" onClick={() => setView("scriptlang")}>
            <BookOpen size={15} />
            Docs
          </button>
        </div>
      </div>

      <div className="runner-quick-strip">
        <div className="runner-quick-scroll">
          {QUICK_EXAMPLES.map((ex) => (
            <button key={ex.name} className="runner-quick-pill" onClick={() => loadCode(ex.code)}>
              {ex.name}
            </button>
          ))}
        </div>
      </div>

      <div className="runner-args-section">
        <div className="runner-args-header">
          <span className="runner-args-label">Args ({scriptArgs.filter(a=>a.trim()).length})</span>
          <button className="runner-args-add" onClick={addArg}>
            <Plus size={12} />
            Add
          </button>
        </div>
        {scriptArgs.length > 0 && (
          <div className="runner-args-list">
            {scriptArgs.map((arg, i) => (
              <div key={i} className="runner-arg-row">
                <span className="runner-arg-index">{i}.</span>
                <input
                  className="runner-arg-input"
                  value={arg}
                  onChange={(e) => updateArg(i, e.target.value)}
                  placeholder={`arg[${i}]`}
                />
                <button className="runner-arg-remove" onClick={() => removeArg(i)} title="Remove">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CodeEditor
        value={code}
        onChange={(v) => { setCode(v); setResult(""); setError(""); }}
        placeholder={"Write any Trill expression or script...\ne.g. upper(\"hello\")"}
        onRun={run}
      />

      {(hasResult || hasError) && (
        <div className={`runner-output ${hasError ? "is-error" : ""}`}>
          <div className="runner-output-header">
            <span className="runner-output-label">
              {hasError ? <X size={12} /> : <Terminal size={12} />}
              {hasError ? "Error" : "Output"}
            </span>
            <div className="runner-output-spacer" />
            <button className="runner-output-clear" onClick={() => { setResult(""); setError(""); }} title="Clear">
              <Trash2 size={11} />
            </button>
          </div>
          <div className="runner-output-body">
            <span className="runner-output-prompt">{hasError ? "✗" : "▸"}</span>
            <pre className="runner-output-text">{hasError ? error : result}</pre>
          </div>
          {hasResult && !hasError && (
            <div className="runner-output-actions">
              <button className="runner-copy-btn" onClick={copyResult}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy result"}
              </button>
            </div>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <div className="runner-recent-section">
          <button className="runner-recent-toggle" onClick={() => setShowRecent(!showRecent)}>
            {showRecent ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <Clock size={13} />
            <span>Recent Scripts</span>
            <span className="runner-recent-count">{recent.length}</span>
            <div className="runner-recent-spacer" />
            <button className="runner-recent-clear-all" onClick={(e) => { e.stopPropagation(); clearRecent(); }} title="Clear all">
              <Trash2 size={11} />
            </button>
          </button>
          {showRecent && (
            <div className="runner-recent-grid">
              {recent.map((script, i) => (
                <button
                  key={i}
                  className="runner-recent-card"
                  onClick={() => loadCode(script)}
                  title={script}
                >
                  <code className="runner-recent-script">
                    <Play size={10} className="runner-recent-play" />
                    {script.length > 80 ? script.slice(0, 80) + "..." : script}
                  </code>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
