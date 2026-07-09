import { convertFileSrc } from "@tauri-apps/api/core";
import { prepareMediaPreview, type MediaPreviewPayload } from "@/lib/fs";

type CacheEntry = MediaPreviewPayload & { cachedAt: number };

const previewCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<MediaPreviewPayload>>();
const assetUrlCache = new Map<string, string>();

export function getCachedMedia(path: string): MediaPreviewPayload | null {
  const entry = previewCache.get(path);
  return entry ?? null;
}

export function invalidateMediaCache(path: string) {
  previewCache.delete(path);
  for (const key of assetUrlCache.keys()) {
    if (key.startsWith(`${path}:`)) assetUrlCache.delete(key);
  }
}

export function mediaAssetUrl(absolutePath: string, version: number): string {
  const key = `${absolutePath}:${version}`;
  const hit = assetUrlCache.get(key);
  if (hit) return hit;
  const base = convertFileSrc(absolutePath);
  const url = `${base}${base.includes("?") ? "&" : "?"}v=${version}`;
  assetUrlCache.set(key, url);
  return url;
}

export async function resolveMediaPreview(
  path: string,
  opts?: { force?: boolean },
): Promise<MediaPreviewPayload> {
  if (!opts?.force) {
    const cached = previewCache.get(path);
    if (cached) return cached;
  }

  const pending = inflight.get(path);
  if (pending) return pending;

  const task = prepareMediaPreview(path)
    .then((payload) => {
      previewCache.set(path, { ...payload, cachedAt: Date.now() });
      inflight.delete(path);
      return payload;
    })
    .catch((err) => {
      inflight.delete(path);
      throw err;
    });

  inflight.set(path, task);
  return task;
}

/** Fire-and-forget warm-up for hover / visible tree rows. */
export function prefetchMediaPreview(path: string) {
  if (previewCache.has(path) || inflight.has(path)) return;
  void resolveMediaPreview(path).catch(() => {});
}
