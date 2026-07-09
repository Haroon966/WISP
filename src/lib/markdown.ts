import { convertFileSrc } from "@tauri-apps/api/core";
import { extensionFromPath } from "@/lib/media";

const MARKDOWN_EXTS = new Set(["md", "mdx"]);

export function isMarkdownPath(path: string): boolean {
  const ext = extensionFromPath(path);
  return ext !== null && MARKDOWN_EXTS.has(ext);
}

export function markdownFileDir(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
}

export function resolveMarkdownAssetUrl(fileDir: string, href: string): string {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("data:")
  ) {
    return href;
  }
  const absolute = href.startsWith("/")
    ? href
    : fileDir
      ? `${fileDir}/${href}`
      : href;
  return convertFileSrc(absolute);
}

// ponytail: self-check
if (import.meta.env.DEV) {
  console.assert(isMarkdownPath("~/README.md"));
  console.assert(isMarkdownPath("~/docs/page.MDX"));
  console.assert(!isMarkdownPath("~/main.ts"));
  console.assert(markdownFileDir("~/proj/README.md") === "~/proj");
}
