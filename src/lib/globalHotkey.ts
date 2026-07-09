import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { tauriReady, tauriWindow } from "@/lib/tauriWindow";
import { useSettingsStore } from "@/stores/useSettingsStore";

let registered: string | null = null;

async function toggleWindow() {
  const win = tauriWindow();
  if (!win) return;
  const visible = await win.isVisible();
  if (visible) {
    await win.hide();
  } else {
    await win.show();
    await win.setFocus();
  }
}

export async function syncGlobalHotkey() {
  if (!tauriReady()) return;
  const { globalHotkeyEnabled, globalHotkey } =
    useSettingsStore.getState().settings;

  if (registered) {
    try {
      await unregister(registered);
    } catch {
      // ponytail: hotkey may already be gone
    }
    registered = null;
  }

  if (!globalHotkeyEnabled || !globalHotkey) return;

  try {
    await register(globalHotkey, () => {
      void toggleWindow();
    });
    registered = globalHotkey;
  } catch (err) {
    console.warn("Global hotkey registration failed:", err);
  }
}
