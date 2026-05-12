import { useState, useEffect } from "react";
import { Zap, Hash, BookOpen, Download, Upload, Settings, Package, ArrowUpFromLine } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { check, Update } from "@tauri-apps/plugin-updater";
import { useStore } from "../store";
import { t } from "../i18n";

export function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const triggers = useStore((s) => s.triggers);
  const globalVars = useStore((s) => s.globalVars);
  const lang = useStore((s) => s.settings.language);
  const loadData = useStore((s) => s.loadData);
  const triggerCount = triggers.length;
  const globalVarCount = globalVars.length;
  const [update, setUpdate] = useState<Update | null>(null);

  useEffect(() => {
    check().then((u) => setUpdate(u)).catch(() => {});
  }, []);
  async function handleExport() {
    try {
      const filePath = await save({
        title: "Export Data",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!filePath) return;
      await invoke("export_data_to_file", { path: filePath });
    } catch (e) {
      console.error("Export failed:", e);
    }
  }

  async function handleImport() {
    try {
      const filePath = await open({
        title: "Import Data",
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      if (!filePath) return;
      const json = await readTextFile(filePath as string);
      const result = await invoke<string>("import_data", { json });
      alert(result);
      loadData();
    } catch (e) {
      console.error("Import failed:", e);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <LogoIcon size={28} />
          <span className="logo-text">trigr</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${view === "triggers" ? "active" : ""}`}
          onClick={() => setView("triggers")}
        >
          <Zap size={16} />
          <span className="nav-label">{t("sidebar.triggers", lang)}</span>
          <span className="nav-badge">{triggerCount}</span>
        </button>
        <button
          className={`nav-item ${view === "globalvars" ? "active" : ""}`}
          onClick={() => setView("globalvars")}
        >
          <Hash size={16} />
          <span className="nav-label">{t("sidebar.variables", lang)}</span>
          <span className="nav-badge">{globalVarCount}</span>
        </button>
        <button
          className={`nav-item ${view === "scriptlang" ? "active" : ""}`}
          onClick={() => setView("scriptlang")}
        >
          <BookOpen size={16} />
          <span className="nav-label">{t("sidebar.script", lang)}</span>
        </button>
        <button
          className={`nav-item ${view === "packages" ? "active" : ""}`}
          onClick={() => setView("packages")}
        >
          <Package size={16} />
          <span className="nav-label">{t("sidebar.packages", lang)}</span>
        </button>
        <button
          className={`nav-item ${view === "settings" ? "active" : ""}`}
          onClick={() => setView("settings")}
        >
          <Settings size={16} />
          <span className="nav-label">{t("sidebar.settings", lang)}</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        {update && (
          <div
            className="update-banner"
            onClick={() => update.downloadAndInstall()}
            title={`Update to ${update.version}`}
          >
            <ArrowUpFromLine size={14} />
            <span>Update Available</span>
          </div>
        )}
        <button className="nav-item data-btn" onClick={handleExport}>
          <Download size={14} />
          <span>{t("sidebar.export", lang)}</span>
        </button>
        <button className="nav-item data-btn" onClick={handleImport}>
          <Upload size={14} />
          <span>{t("sidebar.import", lang)}</span>
        </button>
      </div>
    </aside>
  );
}

function LogoIcon({ size }: { size: number }) {
  return (
    <svg
      className="logo-icon"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="48" y="48" width="416" height="416" rx="96" fill="#1a1a2e" />
      <path d="M192,160 L152,160 L120,216 L120,296 L152,352 L192,352" stroke="#8b5cf6" strokeWidth="32" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M320,160 L360,160 L392,216 L392,296 L360,352 L320,352" stroke="#8b5cf6" strokeWidth="32" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M272,128 L208,256 L248,256 L232,384 L336,240 L276,240 Z" fill="#a78bfa" stroke="#ffffff" strokeWidth="8" strokeLinejoin="round" />
    </svg>
  );
}
