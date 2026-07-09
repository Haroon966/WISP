const IMAGE_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "svg",
  "avif",
  "heic",
  "heif",
]);

const VIDEO_EXTS = new Set([
  "mp4",
  "webm",
  "ogg",
  "ogv",
  "mov",
  "mkv",
  "avi",
  "m4v",
]);

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  ogv: "video/ogg",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  m4v: "video/x-m4v",
};

export type MediaKind = "image" | "video";

export function extensionFromPath(path: string): string | null {
  const base = path.split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  if (dot === -1) return null;
  return base.slice(dot + 1).toLowerCase();
}

export function mediaKindFromPath(path: string): MediaKind | null {
  const ext = extensionFromPath(path);
  if (!ext) return null;
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  return null;
}

export function mimeTypeFromPath(path: string): string | null {
  const ext = extensionFromPath(path);
  if (!ext) return null;
  return MIME_BY_EXT[ext] ?? null;
}

export function isMediaPath(path: string): boolean {
  return mediaKindFromPath(path) !== null;
}

export const IMAGE_PREVIEW_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_PREVIEW_MAX_BYTES = 500 * 1024 * 1024;

export function canPreviewMedia(path: string, sizeBytes: number): boolean {
  const kind = mediaKindFromPath(path);
  if (!kind) return false;
  const max = kind === "video" ? VIDEO_PREVIEW_MAX_BYTES : IMAGE_PREVIEW_MAX_BYTES;
  return sizeBytes <= max;
}

// ponytail: self-check
if (import.meta.env.DEV) {
  console.assert(mediaKindFromPath("~/a.png") === "image");
  console.assert(mediaKindFromPath("~/b.MP4") === "video");
  console.assert(mimeTypeFromPath("~/photo.webp") === "image/webp");
}
