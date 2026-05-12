import { useState, useRef, useEffect } from "react";
import { Eye, X, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { Trigger, GlobalVar } from "../types";
import { fuzzySearchCategories, FuzzyCategory } from "../utils/fuzzy";

interface TriggerFormProps {
  trigger?: Trigger;
  onSave: (t: Trigger) => void;
  onCancel: () => void;
  globalVars: GlobalVar[];
  categoryCounts: Map<string, number>;
}

export function TriggerForm({ trigger, onSave, onCancel, globalVars: _globalVars, categoryCounts }: TriggerFormProps) {
  const isEdit = !!trigger;
  const [triggerText, setTriggerText] = useState(trigger?.trigger_text || "");
  const [replacement, setReplacement] = useState(trigger?.replacement || "");
  const [category, setCategory] = useState(trigger?.category || "");
  const [argsMode, setArgsMode] = useState(trigger?.args_mode || false);
  const [preview, setPreview] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const categoryRef = useRef<HTMLDivElement>(null);

  const suggestions = fuzzySearchCategories(categoryCounts, categoryFilter);
  const filtered = suggestions.filter((c) => c.name !== category);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCategory(cat: FuzzyCategory) {
    setCategory(cat.name);
    setCategoryFilter(cat.name);
    setShowCategoryDropdown(false);
  }

  async function handleSave() {
    if (!triggerText.trim() || !replacement.trim()) return;

    const vars: { name: string; script: string }[] = trigger?.vars || [];

    if (isEdit && trigger) {
      const updated = await invoke<Trigger>("update_trigger", {
        id: trigger.id,
        triggerText: triggerText.trim(),
        replacement,
        category: category.trim(),
        argsMode,
        vars,
      });
      onSave(updated);
    } else {
      const created = await invoke<Trigger>("add_trigger", {
        triggerText: triggerText.trim(),
        replacement,
        category: category.trim(),
        argsMode,
        vars,
      });
      onSave(created);
    }
  }

  async function handlePreview() {
    const result = await invoke<string>("preview_replacement", {
      triggerText: triggerText.trim(),
      replacement,
      vars: trigger?.vars || [],
    });
    setPreview(result);
  }

  return (
    <div className="form-panel">
      <div className="form-header">
        <h2>{isEdit ? "Edit Trigger" : "New Trigger"}</h2>
        <button className="btn-close" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>
      <div className="form-grid">
        <div className="form-group trigger-text-field">
          <label>Trigger Text</label>
          <input
            type="text"
            value={triggerText}
            onChange={(e) => setTriggerText(e.target.value)}
            placeholder="e.g. ;email"
            className="input-field trigger-text-input"
          />
        </div>
        <div className="form-group category-field">
          <label>Category</label>
          <div className="category-input-wrapper" ref={categoryRef}>
            <input
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCategoryFilter(e.target.value);
                setShowCategoryDropdown(true);
              }}
              onFocus={() => {
                setCategoryFilter(category);
                setShowCategoryDropdown(true);
              }}
              placeholder="e.g. work, email"
              className="input-field category-input"
            />
            {showCategoryDropdown && filtered.length > 0 && (
              <div className="category-dropdown">
                {filtered.map((cat) => (
                  <button
                    key={cat.name}
                    className="category-dropdown-item"
                    onClick={() => selectCategory(cat)}
                  >
                    <span className="cat-name">{cat.name}</span>
                    <span className="cat-count">{cat.count}</span>
                    {cat.name === category && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="form-group replacement-field">
        <label>Replacement</label>
        <textarea
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder='Use {{expression}} for inline Trill'
          rows={4}
          className="input-field textarea"
        />
      </div>
      <div className="form-footer">
        <div className="trigger-form-footer-left">
          <label className="toggle-label args-toggle">
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={argsMode}
                onChange={(e) => setArgsMode(e.target.checked)}
              />
              <span className="toggle-slider" />
            </span>
            <div className="toggle-content">
              <span className="toggle-title">Argument mode</span>
              <span className="toggle-desc">Waits for <code>!</code> to expand</span>
            </div>
          </label>
        </div>
        <div className="form-actions">
          <button className="btn-secondary" onClick={handlePreview}>
            <Eye size={14} /> Preview
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {isEdit ? "Save Changes" : "Create Trigger"}
          </button>
        </div>
      </div>

      {preview && (
        <div className="preview-panel">
          <h4>Preview</h4>
          <pre>{preview}</pre>
        </div>
      )}
    </div>
  );
}