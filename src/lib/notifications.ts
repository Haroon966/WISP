import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useSettingsStore } from "@/stores/useSettingsStore";

export async function notifyCommandComplete(
  tabName: string,
  command: string,
  success: boolean,
) {
  if (!useSettingsStore.getState().settings.notifyOnCommandComplete) return;

  let granted = await isPermissionGranted();
  if (!granted) {
    const perm = await requestPermission();
    granted = perm === "granted";
  }
  if (!granted) return;

  const trimmed = command.length > 80 ? `${command.slice(0, 77)}…` : command;
  await sendNotification({
    title: success ? `${tabName} — done` : `${tabName} — failed`,
    body: trimmed,
  });
}
