import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type TerminalFontFamily,
} from "@/types/settings";

const STORAGE_KEY = "wisp-settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      customColors: {
        ...DEFAULT_SETTINGS.customColors,
        ...parsed.customColors,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: loadSettings(),

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    saveSettings(settings);
    set({ settings });
  },

  resetSettings: () => {
    saveSettings(DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },
}));

export function getTerminalFontFamily(family: TerminalFontFamily): string {
  const stacks: Record<TerminalFontFamily, string> = {
    jetbrains: "JetBrains Mono, var(--font-mono), monospace",
    fira: "Fira Code, var(--font-mono), monospace",
    source: "Source Code Pro, var(--font-mono), monospace",
    system: "ui-monospace, SFMono-Regular, Menlo, monospace",
  };
  return stacks[family];
}

export const SIDEBAR_WIDTH_CLASS: Record<Settings["sidebarWidth"], string> = {
  narrow: "w-60",
  default: "w-72",
  wide: "w-80",
};

export const SIDEBAR_COLLAPSED_CLASS = "w-14";
