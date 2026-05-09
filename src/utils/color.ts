import { invoke } from "@tauri-apps/api/core";

export interface BlossomColorValue {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  layer: "outer" | "inner";
}

export function hexToBlossom(hex: string): BlossomColorValue {
  const hexToRgb = (h: string) => {
    const cleaned = h.replace("#", "");
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  };

  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rNorm) h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
    else if (max === gNorm) h = ((bNorm - rNorm) / d + 2) / 6;
    else h = ((rNorm - gNorm) / d + 4) / 6;
  }

  return { hue: h * 360, saturation: s * 100, lightness: l * 100, alpha: 100, layer: "outer" };
}

function isLight(hex: string): boolean {
  const hexToRgb = (h: string) => {
    const cleaned = h.replace("#", "");
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  };
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export function applyThemeColors(hex: string) {
  const hexToRgb = (h: string) => {
    const cleaned = h.replace("#", "");
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  };

  const lighten = (hex: string, amount: number) => {
    const { r, g, b } = hexToRgb(hex);
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${toHex(r + amount)}${toHex(g + amount)}${toHex(b + amount)}`;
  };

  const withAlpha = (hex: string, alpha: number) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  document.documentElement.style.setProperty("--accent", hex);
  document.documentElement.style.setProperty("--accent-hover", lighten(hex, 30));
  document.documentElement.style.setProperty("--accent-muted", withAlpha(hex, 0.15));
  document.documentElement.style.setProperty("--accent-text", isLight(hex) ? "#000000" : "#ffffff");
  document.documentElement.style.setProperty("--success-muted", withAlpha(hex, 0.15));

  updateFavicon(hex);
  updateInlineLogo(hex);
  invoke("update_tray_icon", { themeColor: hex }).catch(() => {});
}

function updateFavicon(accent: string) {
  const lighten = (hex: string, amount: number) => {
    const hexToRgb = (h: string) => {
      const cleaned = h.replace("#", "");
      return {
        r: parseInt(cleaned.slice(0, 2), 16),
        g: parseInt(cleaned.slice(2, 4), 16),
        b: parseInt(cleaned.slice(4, 6), 16),
      };
    };
    const { r, g, b } = hexToRgb(hex);
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${toHex(r + amount)}${toHex(g + amount)}${toHex(b + amount)}`;
  };

  const lightAccent = lighten(accent, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e"/>
        <stop offset="100%" style="stop-color:#0f3460"/>
      </linearGradient>
    </defs>
    <rect x="48" y="48" width="416" height="416" rx="96" fill="url(#bgGrad)"/>
    <path d="M192,160 L152,160 L120,216 L120,296 L152,352 L192,352" stroke="${accent}" stroke-width="32" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M320,160 L360,160 L392,216 L392,296 L360,352 L320,352" stroke="${accent}" stroke-width="32" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M272,128 L208,256 L248,256 L232,384 L336,240 L276,240 Z" fill="${lightAccent}" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"/>
  </svg>`;

  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (favicon) {
    favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }
}

function updateInlineLogo(accent: string) {
  const lighten = (hex: string, amount: number) => {
    const hexToRgb = (h: string) => {
      const cleaned = h.replace("#", "");
      return {
        r: parseInt(cleaned.slice(0, 2), 16),
        g: parseInt(cleaned.slice(2, 4), 16),
        b: parseInt(cleaned.slice(4, 6), 16),
      };
    };
    const { r, g, b } = hexToRgb(hex);
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${toHex(r + amount)}${toHex(g + amount)}${toHex(b + amount)}`;
  };

  const lightAccent = lighten(accent, 40);
  const logoSvg = document.querySelector<SVGElement>('.logo-icon');
  if (logoSvg) {
    const paths = logoSvg.querySelectorAll('path');
    if (paths.length >= 3) {
      paths[0].setAttribute('stroke', accent);
      paths[1].setAttribute('stroke', accent);
      paths[2].setAttribute('fill', lightAccent);
      paths[2].setAttribute('stroke', '#ffffff');
    }
  }
}
