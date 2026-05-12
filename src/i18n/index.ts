import en from "./en.json";
import fr from "./fr.json";

const locales: Record<string, Record<string, string>> = { en, fr };

export function t(
  key: string,
  lang: string,
  params?: Record<string, string>,
): string {
  const locale = locales[lang] || locales["en"];
  let val = locale[key];
  if (!val) {
    val = locales["en"][key] || key;
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replace(`{${k}}`, v);
    }
  }
  return val;
}

export const languages = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];
