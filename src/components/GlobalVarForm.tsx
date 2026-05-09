import { useState } from "react";
import { X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { GlobalVar } from "../types";

interface GlobalVarFormProps {
  globalVar?: GlobalVar;
  onSave: (v: GlobalVar) => void;
  onCancel: () => void;
}

export function GlobalVarForm({ globalVar, onSave, onCancel }: GlobalVarFormProps) {
  const isEdit = !!globalVar;
  const [name, setName] = useState(globalVar?.name || "");
  const [script, setScript] = useState(globalVar?.script || "");
  const [preview, setPreview] = useState("");

  async function handlePreview() {
    const result = await invoke<string>("evaluate_script", {
      source: script,
      context: {},
    });
    setPreview(result);
  }

  async function handleSave() {
    if (!name.trim()) return;

    if (isEdit && globalVar) {
      const updated = await invoke<GlobalVar>("update_global_var", {
        id: globalVar.id,
        name: name.trim(),
        script,
      });
      onSave(updated);
    } else {
      const created = await invoke<GlobalVar>("add_global_var", {
        name: name.trim(),
        script,
      });
      onSave(created);
    }
  }

  return (
    <div className="form-panel">
      <h2>{isEdit ? "Edit Variable" : "New Global Variable"}</h2>
      <div className="form-grid">
        <div className="form-group">
          <label>Variable Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="myname"
            className="input-field"
          />
        </div>
        <div className="form-group full-width">
          <label>Script</label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="e.g. date('%Y-%m-%d') or upper(name)"
            rows={3}
            className="input-field textarea script-input"
          />
        </div>
      </div>

      {preview && (
        <div className="preview-panel">
          <h4>Preview</h4>
          <pre>{preview}</pre>
        </div>
      )}

      <div className="form-actions">
        <button className="btn-secondary" onClick={handlePreview}>
          Preview
        </button>
        <button className="btn-primary" onClick={handleSave}>
          {isEdit ? "Save Changes" : "Create Variable"}
        </button>
        <button className="btn-ghost" onClick={onCancel}>
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
