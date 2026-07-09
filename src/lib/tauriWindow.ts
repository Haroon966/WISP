import { getCurrentWindow, type Window } from "@tauri-apps/api/window";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      metadata?: { currentWindow?: { label?: string } };
      transformCallback?: (...args: unknown[]) => unknown;
      invoke?: (...args: unknown[]) => unknown;
    };
    __TAURI__?: unknown;
  }
}

export function tauriReady(): boolean {
  const internals = window.__TAURI_INTERNALS__;
  return Boolean(internals?.transformCallback && internals.invoke);
}

let readyPromise: Promise<void> | null = null;

/** Resolves once Tauri injects IPC (invoke/transformCallback). */
export function waitForTauri(): Promise<void> {
  if (tauriReady()) return Promise.resolve();
  readyPromise ??= new Promise((resolve) => {
    let frames = 0;
    const maxFrames = 600; // ~10s at 60fps — ponytail: don't spin forever if IPC never injects
    const tick = () => {
      if (tauriReady() || frames++ >= maxFrames) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });
  return readyPromise;
}

export function tauriWindowReady(): boolean {
  return tauriReady();
}

/** Safe wrapper — IPC may not exist on the first React paint. */
export function tauriWindow(): Window | null {
  if (!tauriReady()) return null;
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
}
