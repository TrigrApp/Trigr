import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Trigger, GlobalVar } from "./types";

interface AppSettings {
  ender_char: string;
  theme_color: string;
  font_size: number;
  language: string;
}

interface AppState {
  view: "triggers" | "globalvars" | "scriptlang" | "scriptrunner" | "packages" | "package-detail" | "settings";
  setView: (v: AppState["view"]) => void;

  triggers: Trigger[];
  setTriggers: (t: Trigger[]) => void;
  globalVars: GlobalVar[];
  setGlobalVars: (v: GlobalVar[]) => void;
  loading: boolean;

  loadData: () => Promise<void>;
  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  view: "triggers",
  setView: (view) => set({ view }),

  triggers: [],
  setTriggers: (triggers) => set({ triggers }),
  globalVars: [],
  setGlobalVars: (globalVars) => set({ globalVars }),

  loading: true,

  loadData: async () => {
    set({ loading: true });
    try {
      const data = await invoke<{ triggers: Trigger[]; global_vars: GlobalVar[] }>("get_all_data");
      set({ triggers: data.triggers, globalVars: data.global_vars, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  settings: { ender_char: "!", theme_color: "#8b5cf6", font_size: 14, language: "en" },
  loadSettings: async () => {
    try {
      const s = await invoke<AppSettings>("get_settings");
      set({ settings: s });
    } catch {}
  },
  updateSettings: async (partial) => {
    const current = get().settings;
    const merged = { ...current, ...partial };
    set({ settings: merged });
    try {
      await invoke("update_settings", {
        enderChar: merged.ender_char,
        themeColor: merged.theme_color,
        fontSize: merged.font_size,
        language: merged.language,
      });
    } catch {}
  },
}));
