import { Zap, Hash, BookOpen, Download, Upload, Settings, Package } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { ViewType } from "../types";

interface SidebarProps {
  view: ViewType;
  setView: (v: ViewType) => void;
  triggerCount: number;
  globalVarCount: number;
  onReload: () => void;
}

export function Sidebar({ view, setView, triggerCount, globalVarCount, onReload }: SidebarProps) {
  async function handleExport() {
    try {
      const filePath = await save({
        title: "Export Data",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!filePath) return;
      const json = await invoke<string>("export_data");
      await writeTextFile(filePath, json);
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
      onReload();
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
          <span className="nav-label">Triggers</span>
          <span className="nav-badge">{triggerCount}</span>
        </button>
        <button
          className={`nav-item ${view === "globalvars" ? "active" : ""}`}
          onClick={() => setView("globalvars")}
        >
          <Hash size={16} />
          <span className="nav-label">Variables</span>
          <span className="nav-badge">{globalVarCount}</span>
        </button>
        <button
          className={`nav-item ${view === "scriptlang" ? "active" : ""}`}
          onClick={() => setView("scriptlang")}
        >
          <BookOpen size={16} />
          <span className="nav-label">Documentation</span>
        </button>
        <button
          className={`nav-item ${view === "packages" ? "active" : ""}`}
          onClick={() => setView("packages")}
        >
          <Package size={16} />
          <span className="nav-label">Packages</span>
        </button>
        <button
          className={`nav-item ${view === "settings" ? "active" : ""}`}
          onClick={() => setView("settings")}
        >
          <Settings size={16} />
          <span className="nav-label">Settings</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item data-btn" onClick={handleExport}>
          <Download size={14} />
          <span>Export</span>
        </button>
        <button className="nav-item data-btn" onClick={handleImport}>
          <Upload size={14} />
          <span>Import</span>
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
