import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

export type FsChangePayload = {
  watchId: string;
  paths: string[];
  kind: string;
};

type FsChangeHandler = (payload: FsChangePayload) => void;

const handlers = new Map<string, Set<FsChangeHandler>>();
let globalUnlisten: UnlistenFn | null = null;
let coalesceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingByWatch = new Map<string, FsChangePayload>();

async function ensureListener() {
  if (globalUnlisten) return;
  globalUnlisten = await listen<FsChangePayload>("fs:change", (event) => {
    const payload = event.payload;
    const existing = pendingByWatch.get(payload.watchId);
    if (existing) {
      existing.paths = [...new Set([...existing.paths, ...payload.paths])];
      existing.kind = payload.kind;
    } else {
      pendingByWatch.set(payload.watchId, { ...payload, paths: [...payload.paths] });
    }
    if (coalesceTimer) clearTimeout(coalesceTimer);
    coalesceTimer = setTimeout(flushPending, 50);
  });
}

function flushPending() {
  coalesceTimer = null;
  for (const payload of pendingByWatch.values()) {
    const subs = handlers.get(payload.watchId);
    if (subs) {
      for (const fn of subs) fn(payload);
    }
  }
  pendingByWatch.clear();
}

export function subscribeFsWatch(watchId: string, handler: FsChangeHandler): () => void {
  void ensureListener();
  let subs = handlers.get(watchId);
  if (!subs) {
    subs = new Set();
    handlers.set(watchId, subs);
  }
  subs.add(handler);
  return () => {
    subs?.delete(handler);
    if (subs?.size === 0) handlers.delete(watchId);
  };
}

export function useFsWatch(
  watchId: string | null | undefined,
  onChange: FsChangeHandler,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!watchId) return;
    return subscribeFsWatch(watchId, (payload) => onChangeRef.current(payload));
  }, [watchId]);
}
