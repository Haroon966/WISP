import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyTheme, initTheme } from "./lib/theme";
import { syncGlobalHotkey } from "./lib/globalHotkey";
import { waitForTauri } from "./lib/tauriWindow";
import { wireSessionPersist } from "./stores/wireSessionPersist";
import { useSettingsStore } from "./stores/useSettingsStore";
import "./index.css";

initTheme(() => {
  const { theme, colorPalette, customColors } = useSettingsStore.getState().settings;
  return { theme, colorPalette, customColors };
});

useSettingsStore.subscribe((state, prev) => {
  const s = state.settings;
  const p = prev.settings;
  if (
    s.theme !== p.theme ||
    s.colorPalette !== p.colorPalette ||
    s.customColors.accent !== p.customColors.accent ||
    s.customColors.secondary !== p.customColors.secondary
  ) {
    applyTheme(s);
  }
  if (
    state.settings.globalHotkeyEnabled !== prev.settings.globalHotkeyEnabled ||
    state.settings.globalHotkey !== prev.settings.globalHotkey
  ) {
    void syncGlobalHotkey();
  }
});

wireSessionPersist();

void waitForTauri().then(() => syncGlobalHotkey());

const app = <App />;
const inTauri = Boolean(import.meta.env.TAURI_ENV_PLATFORM);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  inTauri ? app : <React.StrictMode>{app}</React.StrictMode>,
);
