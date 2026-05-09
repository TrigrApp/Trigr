export interface Trigger {
  id: string;
  trigger_text: string;
  replacement: string;
  enabled: boolean;
  category: string;
  args_mode: boolean;
  vars: TriggerVar[];
  created_at: string;
  updated_at: string;
}

export interface TriggerVar {
  name: string;
  script: string;
}

export interface GlobalVar {
  id: string;
  name: string;
  script: string;
  enabled: boolean;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: PackageTrigger[];
}

export interface PackageTrigger {
  trigger_text: string;
  replacement: string;
}

export type ViewType = "triggers" | "globalvars" | "scriptlang" | "packages" | "package-detail" | "settings";