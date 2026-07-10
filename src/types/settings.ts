export type ThemeMode = "system" | "light" | "dark";

export type SidebarWidth = "narrow" | "default" | "wide";

export type ColorPaletteId =
  | "wisp"
  | "ocean"
  | "ember"
  | "forest"
  | "lavender"
  | "rose"
  | "mono"
  | "custom";

export interface CustomColors {
  accent: string;
  secondary: string;
}

export type TerminalFontFamily =
  | "jetbrains"
  | "fira"
  | "source"
  | "system";

export interface Settings {
  theme: ThemeMode;
  colorPalette: ColorPaletteId;
  customColors: CustomColors;
  sidebarWidth: SidebarWidth;
  sidebarCollapsed: boolean;
  showSidebarSearch: boolean;
  terminalFontSize: number;
  terminalCursorBlink: boolean;
  terminalFontFamily: TerminalFontFamily;
  fishAutosuggestions: boolean;
  defaultCwd: string;
  maxClosedTabs: number;
  confirmCloseTab: boolean;
  restoreSessionOnLaunch: boolean;
  notifyOnCommandComplete: boolean;
  globalHotkeyEnabled: boolean;
  globalHotkey: string;
  explorerOpen: boolean;
  explorerWidthPx: number;
  explorerShowHidden: boolean;
  editorAutosave: "off" | "onFocusChange" | "afterDelay";
  editorAutosaveDelayMs: number;
  editorLargeFileWarningBytes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  colorPalette: "wisp",
  customColors: { accent: "#d6fb00", secondary: "#00545f" },
  sidebarWidth: "default",
  sidebarCollapsed: false,
  showSidebarSearch: true,
  terminalFontSize: 14,
  terminalCursorBlink: true,
  terminalFontFamily: "jetbrains",
  fishAutosuggestions: true,
  defaultCwd: "~",
  maxClosedTabs: 20,
  confirmCloseTab: false,
  restoreSessionOnLaunch: true,
  notifyOnCommandComplete: true,
  globalHotkeyEnabled: false,
  globalHotkey: "CommandOrControl+Backquote",
  explorerOpen: true,
  explorerWidthPx: 260,
  explorerShowHidden: false,
  editorAutosave: "onFocusChange",
  editorAutosaveDelayMs: 1000,
  editorLargeFileWarningBytes: 2_097_152,
};
