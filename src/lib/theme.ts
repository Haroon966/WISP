export const BRAND = {
  pale: "#eaffb6",
  neon: "#d6fb00",
  teal: "#00545f",
} as const;

export const SURFACE = {
  light: "#f1f1f1",
  charcoal: "#2b2b2b",
} as const;

export function isDarkTheme() {
  return document.documentElement.classList.contains("dark");
}

export function getTerminalTheme() {
  const dark = isDarkTheme();
  return dark
    ? {
        background: SURFACE.charcoal,
        foreground: SURFACE.light,
        cursor: BRAND.neon,
        selectionBackground: `${BRAND.neon}40`,
      }
    : {
        background: SURFACE.light,
        foreground: SURFACE.charcoal,
        cursor: BRAND.neon,
        selectionBackground: `${BRAND.teal}30`,
      };
}

export function initTheme() {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    document.documentElement.classList.toggle("dark", mq.matches);
  };
  apply();
  mq.addEventListener("change", apply);
}
