import type { Settings, ThemeMode } from "@/types/settings";
import {
  applyColorPalette,
  readCssHex,
} from "@/lib/color-themes";
import { BRAND, SURFACE } from "@/lib/theme-tokens";

export { BRAND, SURFACE } from "@/lib/theme-tokens";

export function isDarkTheme() {
  return document.documentElement.classList.contains("dark");
}

export function getTerminalTheme() {
  const dark = isDarkTheme();
  const accent = readCssHex("--brand-neon") ?? BRAND.neon;
  const secondary = readCssHex("--brand-teal") ?? BRAND.teal;
  const background =
    readCssHex("--background") ?? (dark ? SURFACE.charcoal : SURFACE.light);
  const foreground =
    readCssHex("--foreground") ?? (dark ? SURFACE.light : SURFACE.charcoal);

  return {
    background,
    foreground,
    cursor: accent,
    cursorAccent: background,
    selectionBackground: dark ? `${accent}40` : `${secondary}30`,
  };
}

const MONACO_SURFACE = {
  dark: {
    background: "#0f172a",
    foreground: "#f8fafc",
    lineNumber: "#64748b",
    lineHighlight: "#1e293b80",
    scrollbar: "#33415580",
    scrollbarHover: "#475569b3",
  },
  light: {
    background: "#f5f5f5",
    foreground: "#0f172a",
    lineNumber: "#94a3b8",
    lineHighlight: "#e2e8f080",
    scrollbar: "#cbd5e180",
    scrollbarHover: "#94a3b8b3",
  },
} as const;

export function getMonacoThemeColors(isDark: boolean): Record<string, string> {
  const accent = readCssHex("--brand-neon") ?? BRAND.neon;
  const live = isDarkTheme() === isDark;
  const surface = MONACO_SURFACE[isDark ? "dark" : "light"];
  const background = live
    ? (readCssHex("--background") ?? surface.background)
    : surface.background;
  const foreground = live
    ? (readCssHex("--foreground") ?? surface.foreground)
    : surface.foreground;
  const lineNumber = live
    ? (readCssHex("--muted-foreground") ?? surface.lineNumber)
    : surface.lineNumber;

  return {
    "editor.background": background,
    "editor.foreground": foreground,
    "editorLineNumber.foreground": lineNumber,
    "editorLineNumber.activeForeground": foreground,
    "editor.selectionBackground": isDark ? `${accent}40` : `${accent}30`,
    "editor.inactiveSelectionBackground": isDark ? `${accent}25` : `${accent}20`,
    "editorCursor.foreground": accent,
    "editor.lineHighlightBackground": surface.lineHighlight,
    "editorBracketMatch.background": `${accent}30`,
    "editorBracketMatch.border": accent,
    "scrollbarSlider.background": surface.scrollbar,
    "scrollbarSlider.hoverBackground": surface.scrollbarHover,
  };
}

export function activeMonacoTheme(): "wisp-dark" | "wisp-light" {
  return isDarkTheme() ? "wisp-dark" : "wisp-light";
}

/** Re-run when color scheme, palette, or CSS vars on :root change. */
export function onThemeChange(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-color-palette"],
  });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => {
    observer.disconnect();
    mq.removeEventListener("change", callback);
  };
}

export function applyThemeMode(mode: ThemeMode) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const isDark = mode === "dark" || (mode === "system" && mq.matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function applyTheme(settings: Pick<Settings, "theme" | "colorPalette" | "customColors">) {
  applyThemeMode(settings.theme);
  applyColorPalette(settings.colorPalette, settings.customColors, isDarkTheme());
}

export function initTheme(getSettings: () => Pick<Settings, "theme" | "colorPalette" | "customColors">) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => applyTheme(getSettings());

  apply();
  mq.addEventListener("change", () => {
    if (getSettings().theme === "system") apply();
  });
}
