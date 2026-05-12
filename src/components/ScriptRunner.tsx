import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Terminal, RotateCcw, BookOpen } from "lucide-react";
import { useStore } from "../store";
import { CodeEditor, EditorOutput } from "./CodeEditor";

const QUICK_EXAMPLES = [
  { name: "Hello", code: 'upper("hello world")' },
  { name: "Date", code: 'today("%B %d, %Y")' },
  { name: "Random", code: 'rand(1, 100)' },
  { name: "If", code: 'let x = 15\nif x > 10 then "big" else "small"' },
  { name: "Pipe", code: '[1, 2, 3, 4, 5]\n| filter(x => x > 2)\n| map(x => x * 10)\n| join_list(", ")' },
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
  const [recent, setRecent] = useState<string[]>(loadRecent);

  async function run() {
    if (!code.trim()) return;
    try {
      setError("");
      setResult("");
      setRunning(true);
      const res = await invoke<string>("preview_script", { source: code });
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

  function clearAll() {
    setCode("");
    setResult("");
    setError("");
  }

  return (
    <div className="runner-layout">
      <div className="runner-main">
        <div className="view-header">
          <h1>Trill Runner</h1>
          <p className="view-subtitle">Write and test Trill scripts with live evaluation</p>
        </div>

        <div className="runner-toolbar">
          <div className="runner-quick-examples">
            {QUICK_EXAMPLES.map((ex) => (
              <button key={ex.name} className="quick-example-btn" onClick={() => loadCode(ex.code)}>
                {ex.name}
              </button>
            ))}
          </div>
          <div className="runner-actions">
            <button className="runner-action-btn" onClick={clearAll} title="Clear">
              <RotateCcw size={13} />
            </button>
            <button className="runner-action-btn" onClick={() => setView("scriptlang")} title="Open docs">
              <BookOpen size={13} />
            </button>
          </div>
        </div>

        <CodeEditor
          value={code}
          onChange={(v) => { setCode(v); setResult(""); setError(""); }}
          placeholder={"Write any Trill expression or script...\ne.g. upper(\"hello\")"}
          onRun={run}
          running={running}
        />

        <EditorOutput
          result={result}
          error={error}
          onClear={() => { setResult(""); setError(""); }}
        />

        {result && (
          <div className="runner-copy-hint">
            <Terminal size={12} />
            <span>Result: </span>
            <code className="runner-result-value">{result}</code>
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <aside className="runner-sidebar">
          <div className="runner-sidebar-header">Recent</div>
          <div className="runner-recent-list">
            {recent.map((script, i) => (
              <button
                key={i}
                className="runner-recent-item"
                onClick={() => loadCode(script)}
                title={script}
              >
                <code className="runner-recent-code">
                  {script.length > 60 ? script.slice(0, 60) + "…" : script}
                </code>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
