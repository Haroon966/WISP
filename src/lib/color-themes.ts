import type { CustomColors, ColorPaletteId } from "@/types/settings";

export interface ResolvedPalette {
  accent: string;
  accentMuted: string;
  secondary: string;
}

export interface ColorPaletteMeta {
  id: ColorPaletteId;
  name: string;
  description: string;
  preview: [string, string, string];
  colors: ResolvedPalette;
}

export const COLOR_PALETTES: ColorPaletteMeta[] = [
  {
    id: "wisp",
    name: "Wisp",
    description: "Neon lime with deep teal",
    preview: ["#d6fb00", "#eaffb6", "#00545f"],
    colors: { accent: "#d6fb00", accentMuted: "#eaffb6", secondary: "#00545f" },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Bright cyan on navy",
    preview: ["#22d3ee", "#a5f3fc", "#0e7490"],
    colors: { accent: "#22d3ee", accentMuted: "#a5f3fc", secondary: "#0e7490" },
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm amber and rust",
    preview: ["#fb923c", "#fed7aa", "#9a3412"],
    colors: { accent: "#fb923c", accentMuted: "#fed7aa", secondary: "#9a3412" },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Fresh green accents",
    preview: ["#4ade80", "#bbf7d0", "#166534"],
    colors: { accent: "#4ade80", accentMuted: "#bbf7d0", secondary: "#166534" },
  },
  {
    id: "lavender",
    name: "Lavender",
    description: "Soft violet highlights",
    preview: ["#a78bfa", "#ddd6fe", "#5b21b6"],
    colors: { accent: "#a78bfa", accentMuted: "#ddd6fe", secondary: "#5b21b6" },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Pink accent with wine depth",
    preview: ["#fb7185", "#fecdd3", "#9f1239"],
    colors: { accent: "#fb7185", accentMuted: "#fecdd3", secondary: "#9f1239" },
  },
  {
    id: "mono",
    name: "Mono",
    description: "Neutral slate accents",
    preview: ["#94a3b8", "#e2e8f0", "#334155"],
    colors: { accent: "#94a3b8", accentMuted: "#e2e8f0", secondary: "#334155" },
  },
  {
    id: "custom",
    name: "Custom",
    description: "Choose your own accent colors",
    preview: ["#d6fb00", "#eaffb6", "#00545f"],
    colors: { accent: "#d6fb00", accentMuted: "#eaffb6", secondary: "#00545f" },
  },
];

const OVERRIDDEN_VARS = [
  "--brand-neon",
  "--brand-pale",
  "--brand-teal",
  "--primary",
  "--primary-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
  "--status-running",
  "--status-success",
  "--accent",
  "--accent-foreground",
  "--secondary",
  "--secondary-foreground",
] as const;

export function hexToHslChannels(hex: string): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslChannelsToHex(channels: string): string | null {
  const match = channels.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!match) return null;
  const h = Number(match[1]) / 360;
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    const hex = v.toString(16).padStart(2, "0");
    return `#${hex}${hex}${hex}`;
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function mixHex(a: string, b: string, ratio: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const mix = (x: number, y: number) =>
    Math.round(x * (1 - ratio) + y * ratio);
  const r = mix(ar, br).toString(16).padStart(2, "0");
  const g = mix(ag, bg).toString(16).padStart(2, "0");
  const bl = mix(ab, bb).toString(16).padStart(2, "0");
  return `#${r}${g}${bl}`;
}

export function resolvePalette(
  paletteId: ColorPaletteId,
  custom?: CustomColors,
): ResolvedPalette {
  if (paletteId === "custom" && custom) {
    return {
      accent: custom.accent,
      accentMuted: mixHex(custom.accent, "#ffffff", 0.55),
      secondary: custom.secondary,
    };
  }
  const preset = COLOR_PALETTES.find((p) => p.id === paletteId);
  return preset?.colors ?? COLOR_PALETTES[0].colors;
}

function setVar(name: string, hex: string) {
  document.documentElement.style.setProperty(name, hexToHslChannels(hex));
}

export function clearColorPalette() {
  for (const name of OVERRIDDEN_VARS) {
    document.documentElement.style.removeProperty(name);
  }
  document.documentElement.removeAttribute("data-color-palette");
}

export function applyColorPalette(
  paletteId: ColorPaletteId,
  custom: CustomColors | undefined,
  isDark: boolean,
) {
  if (paletteId === "wisp") {
    clearColorPalette();
    return;
  }

  const colors = resolvePalette(paletteId, custom);
  const secondaryBg = mixHex(colors.accentMuted, "#ffffff", 0.45);

  setVar("--brand-neon", colors.accent);
  setVar("--brand-pale", colors.accentMuted);
  setVar("--brand-teal", colors.secondary);
  setVar("--primary", colors.accent);
  setVar("--primary-foreground", colors.secondary);
  setVar("--ring", colors.accent);
  setVar("--sidebar-primary", colors.accent);
  setVar("--sidebar-primary-foreground", colors.secondary);
  setVar("--sidebar-ring", colors.accent);
  setVar("--status-running", colors.accent);
  setVar("--status-success", isDark ? colors.accentMuted : colors.secondary);

  if (isDark) {
    setVar("--accent", colors.secondary);
    setVar("--accent-foreground", colors.accentMuted);
    setVar("--secondary-foreground", colors.accentMuted);
  } else {
    setVar("--accent", colors.accentMuted);
    setVar("--accent-foreground", colors.secondary);
    setVar("--secondary", secondaryBg);
    setVar("--secondary-foreground", colors.secondary);
  }

  document.documentElement.dataset.colorPalette = paletteId;
}

export function readCssHex(varName: string): string | null {
  const channels = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!channels) return null;
  return hslChannelsToHex(channels);
}
