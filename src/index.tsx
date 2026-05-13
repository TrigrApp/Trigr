import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Edit2, Trash2, Plus, ChevronDown, ChevronRight, Search, Zap, Hash } from "lucide-react";
import "./index.css";
import { Sidebar } from "./components/Sidebar";
import { TriggerForm } from "./components/TriggerForm";
import { GlobalVarForm } from "./components/GlobalVarForm";
import { ScriptLangView } from "./components/ScriptLangView";
import { ScriptRunner } from "./components/ScriptRunner";
import { SettingsView } from "./components/SettingsView";
import { PackagesView, PackageDetailView } from "./components/PackagesView";
import type { Trigger, GlobalVar, Package } from "./types";
import { applyThemeColors } from "./utils/color";
import { useStore } from "./store";
import { t } from "./i18n";

function App() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const loading = useStore((s) => s.loading);
  const loadData = useStore((s) => s.loadData);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  useEffect(() => {
    loadData();
    useStore.getState().loadSettings().then(() => {
      const s = useStore.getState().settings;
      applyThemeColors(s.theme_color);
      document.documentElement.style.fontSize = `${s.font_size}px`;
    });
  }, [loadData]);

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        {loading ? (
          <div className="loading">Loading</div>
        ) : view === "triggers" ? (
          <TriggerView />
        ) : view === "globalvars" ? (
          <GlobalVarsView />
        ) : view === "scriptlang" ? (
          <ScriptLangView />
        ) : view === "scriptrunner" ? (
          <ScriptRunner />
        ) : view === "settings" ? (
          <SettingsView />
        ) : view === "packages" ? (
          <PackagesView onSelectPackage={(pkg) => {
            setSelectedPackage(pkg);
            setView("package-detail");
          }} />
        ) : view === "package-detail" && selectedPackage ? (
          <PackageDetailView
            pkg={selectedPackage}
            onBack={() => {
              setView("packages");
              setSelectedPackage(null);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

function TriggerView() {
  const lang = useStore((s) => s.settings.language);
  const triggers = useStore((s) => s.triggers);
  const setTriggers = useStore((s) => s.setTriggers);
  const globalVars = useStore((s) => s.globalVars);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of triggers) {
      if (t.category) {
        counts.set(t.category, (counts.get(t.category) || 0) + 1);
      }
    }
    return counts;
  }, [triggers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return triggers;
    const q = search.toLowerCase();
    return triggers.filter((t) =>
      t.trigger_text.toLowerCase().includes(q) ||
      t.replacement.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [triggers, search]);

  const categories = useMemo(() => {
    return [...new Set(filtered.map((t) => t.category).filter(Boolean))];
  }, [filtered]);

  const uncategorized = useMemo(() => filtered.filter((t) => !t.category), [filtered]);

  async function handleDelete(id: string) {
    await invoke("delete_item", { itemType: "trigger", id });
    setTriggers(triggers.filter((t) => t.id !== id));
  }

  async function handleToggle(id: string, current: boolean) {
    const updated = await invoke<Trigger>("update_trigger", {
      id,
      enabled: !current,
    });
    setTriggers(triggers.map((t) => (t.id === id ? updated : t)));
  }

  function handleAdd(trigger: Trigger) {
    setTriggers([trigger, ...triggers]);
    setShowAdd(false);
  }

  function handleEdit(updated: Trigger) {
    setTriggers(triggers.map((t) => (t.id === updated.id ? updated : t)));
    setEditingId(null);
  }

  return (
    <div className="view-container">
      <div className="view-header view-header-row">
        <div className="view-header-text">
          <h1>{t("triggers.title", lang)}</h1>
          <p className="view-subtitle">{t("triggers.subtitle", lang)}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> {t("triggers.new", lang)}</button>
      </div>

      {showAdd && (
        <TriggerForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
          globalVars={globalVars}
          categoryCounts={categoryCounts}
        />
      )}

      {editingId && (
        <TriggerForm
          trigger={triggers.find((t) => t.id === editingId)}
          onSave={handleEdit}
          onCancel={() => setEditingId(null)}
          globalVars={globalVars}
          categoryCounts={categoryCounts}
        />
      )}

      <div className="search-bar">
        <Search size={14} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("triggers.search", lang)}
          className="search-input"
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch("")}>
            Clear
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="category-groups">
          {categories.map((cat) => {
            const catTriggers = filtered.filter((t) => t.category === cat);
            return (
              <CategoryGroup
                key={cat}
                name={cat}
                count={catTriggers.length}
                triggers={catTriggers}
                onToggle={handleToggle}
                onEdit={(id) => setEditingId(id)}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {uncategorized.length > 0 && (
        <div className="trigger-list">
          {uncategorized.map((trigger) => (
            <TriggerCard
              key={trigger.id}
              trigger={trigger}
              onToggle={handleToggle}
              onEdit={() => setEditingId(trigger.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {triggers.length === 0 && (
        <div className="empty-state">
          <Zap size={32} className="empty-icon" />
          <h3>{t("triggers.empty", lang)}</h3>
          <p>{t("triggers.empty_hint", lang)}</p>
        </div>
      )}

      {triggers.length > 0 && filtered.length === 0 && (
        <div className="empty-state">
          <Search size={32} className="empty-icon" />
          <h3>No matches</h3>
          <p>Try a different search term</p>
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  name,
  count,
  triggers,
  onToggle,
  onEdit,
  onDelete,
}: {
  name: string;
  count: number;
  triggers: Trigger[];
  onToggle: (id: string, current: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="category-group">
      <button className="category-group-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="folder-icon">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
        <span className="folder-name">{name}</span>
        <span className="folder-count">{count}</span>
      </button>
      {!collapsed && (
        <div className="category-triggers">
          {triggers.map((trigger) => (
            <TriggerCard
              key={trigger.id}
              trigger={trigger}
              onToggle={onToggle}
              onEdit={() => onEdit(trigger.id)}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TriggerCard({
  trigger,
  onToggle,
  onEdit,
  onDelete,
}: {
  trigger: Trigger;
  onToggle: (id: string, current: boolean) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`trigger-card ${!trigger.enabled ? "disabled" : ""} ${trigger.args_mode ? "args-mode" : ""}`}
    >
      <div className="trigger-card-header">
        <div className="trigger-header-left">
          <code className="trigger-badge">{trigger.trigger_text}</code>
          {trigger.args_mode && (
            <span className="args-mode-badge">
              <span className="args-dot" />
              args
            </span>
          )}
        </div>
        <div className="trigger-card-actions">
          <button
            className={`toggle-btn ${trigger.enabled ? "active" : ""}`}
            onClick={() => onToggle(trigger.id, trigger.enabled)}
          >
            {trigger.enabled ? "ON" : "OFF"}
          </button>
          <button className="icon-btn" onClick={onEdit}>
            <Edit2 size={14} />
          </button>
          <button className="icon-btn delete-btn" onClick={() => onDelete(trigger.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className="trigger-replacement">{trigger.replacement}</p>
    </div>
  );
}

function GlobalVarsView() {
  const lang = useStore((s) => s.settings.language);
  const globalVars = useStore((s) => s.globalVars);
  const setGlobalVars = useStore((s) => s.setGlobalVars);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    await invoke("delete_item", { itemType: "global_var", id });
    setGlobalVars(globalVars.filter((v) => v.id !== id));
  }

  async function handleToggle(id: string, current: boolean) {
    const updated = await invoke<GlobalVar>("update_global_var", {
      id,
      enabled: !current,
    });
    setGlobalVars(globalVars.map((v) => (v.id === id ? updated : v)));
  }

  function handleAdd(gv: GlobalVar) {
    setGlobalVars([gv, ...globalVars]);
    setShowAdd(false);
  }

  function handleEdit(updated: GlobalVar) {
    setGlobalVars(globalVars.map((v) => (v.id === updated.id ? updated : v)));
    setEditingId(null);
  }

  return (
    <div className="view-container">
      <div className="view-header view-header-row">
        <div className="view-header-text">
          <h1>{t("variables.title", lang)}</h1>
          <p className="view-subtitle">{t("variables.subtitle", lang)}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> {t("variables.new", lang)}</button>
      </div>

      {showAdd && (
        <GlobalVarForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {editingId && (
        <GlobalVarForm
          globalVar={globalVars.find((v) => v.id === editingId)}
          onSave={handleEdit}
          onCancel={() => setEditingId(null)}
        />
      )}

      <div className="globalvar-list">
        {globalVars.length === 0 ? (
          <div className="empty-state">
            <Hash size={32} className="empty-icon" />
            <h3>{t("variables.empty", lang)}</h3>
            <p>{t("variables.empty_hint", lang)}</p>
          </div>
        ) : (
          globalVars.map((gv) => (
            <div key={gv.id} className={`globalvar-card ${!gv.enabled ? "disabled" : ""}`}>
              <div className="globalvar-card-header">
                <code className="globalvar-badge">{"{{" + gv.name + "}}"}</code>
                <div className="globalvar-card-actions">
                  <button
                    className={`toggle-btn ${gv.enabled ? "active" : ""}`}
                    onClick={() => handleToggle(gv.id, gv.enabled)}
                  >
                    {gv.enabled ? "ON" : "OFF"}
                  </button>
                  <button className="icon-btn" onClick={() => setEditingId(gv.id)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="icon-btn delete-btn" onClick={() => handleDelete(gv.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="globalvar-info">
                <code className="globalvar-script">{gv.script}</code>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
