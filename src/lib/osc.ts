export type OscMeta = {
  cwd?: string;
  branch?: string | null;
};

const OSC_RE = /\x1b\](\d+);([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
const WISP_START = "\x1b]777;START\x07";
const WISP_EXIT_RE = /\x1b\]777;EXIT;\d+\x07/g;

function fileUrlToPath(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "file:") return undefined;
    let path = decodeURIComponent(parsed.pathname);
    if (/^\/[A-Za-z]:/.test(path)) path = path.slice(1);
    return path || undefined;
  } catch {
    return undefined;
  }
}

function formatHomePath(path: string): string {
  return path
    .replace(/^\/home\/[^/]+/, "~")
    .replace(/^\/Users\/[^/]+/, "~");
}

export function parseOscMeta(text: string): OscMeta {
  const meta: OscMeta = {};
  for (const match of text.matchAll(OSC_RE)) {
    const code = match[1];
    const payload = match[2];
    if (code === "7") {
      const path = fileUrlToPath(payload);
      if (path) meta.cwd = formatHomePath(path);
    } else if (code === "778") {
      meta.branch = payload || null;
    }
  }
  return meta;
}

export function stripOscAndMarkers(text: string): string {
  return text
    .replace(OSC_RE, "")
    .replace(new RegExp(WISP_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "")
    .replace(WISP_EXIT_RE, "");
}

export function processPtyChunk(
  chunk: number[],
  carry: string,
): { display: Uint8Array; carry: string; meta: OscMeta } {
  const text = carry + new TextDecoder().decode(new Uint8Array(chunk));
  const meta = parseOscMeta(text);
  const cleaned = stripOscAndMarkers(text);

  // ponytail: keep incomplete ESC/OSC sequence in carry for split chunks
  const lastEsc = cleaned.lastIndexOf("\x1b");
  if (lastEsc !== -1) {
    const tail = cleaned.slice(lastEsc);
    if (!/(?:\x07|\x1b\\)/.test(tail)) {
      return {
        display: new TextEncoder().encode(cleaned.slice(0, lastEsc)),
        carry: tail,
        meta,
      };
    }
  }

  return {
    display: new TextEncoder().encode(cleaned),
    carry: "",
    meta,
  };
}
