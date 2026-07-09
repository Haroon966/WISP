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
