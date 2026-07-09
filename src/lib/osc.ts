export type OscMeta = {
  cwd?: string;
  branch?: string | null;
  command?: string;
  completionPrefix?: string;
  completions?: string[];
};

const OSC_RE = /\x1b\](\d+);([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
const WISP_START = "\x1b]777;START\x07";
const WISP_EXIT_RE = /\x1b\]777;EXIT;\d+\x07/g;

function decodeBase64Payload(payload: string): string | undefined {
  const normalized = payload.replace(/\s/g, "");
  if (!normalized) return undefined;
  try {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return undefined;
  }
}

function decodeBase64Command(payload: string): string | undefined {
  return decodeBase64Payload(payload);
}

function decodeOsc780(payload: string): Pick<OscMeta, "completionPrefix" | "completions"> | undefined {
  const json = decodeBase64Payload(payload);
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as {
      prefix?: string;
      candidates?: string[];
    };
    return {
      completionPrefix: parsed.prefix ?? "",
      completions: parsed.candidates ?? [],
    };
  } catch {
    return undefined;
  }
}

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
    } else if (code === "779") {
      const command = decodeBase64Command(payload);
      if (command) meta.command = command;
    } else if (code === "780") {
      const completion = decodeOsc780(payload);
      if (completion) {
        meta.completionPrefix = completion.completionPrefix;
        meta.completions = completion.completions;
      }
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

/** Trailing OSC (ESC ]) without BEL/ST terminator — not CSI cursor/color sequences. */
function incompleteOscSuffix(text: string): string | null {
  const idx = text.lastIndexOf("\x1b]");
  if (idx === -1) return null;
  const tail = text.slice(idx);
  if (/(?:\x07|\x1b\\)/.test(tail)) return null;
  return tail;
}

/** ESC or partial CSI (ESC [ params) waiting for the next chunk — not a complete CSI command. */
function incompleteEscapeSuffix(text: string): string | null {
  const osc = incompleteOscSuffix(text);
  if (osc) return osc;
  if (text.endsWith("\x1b")) return "\x1b";
  const partialCsi = text.match(/\x1b\[[0-9;]*$/);
  if (partialCsi) return partialCsi[0];
  return null;
}

export function processPtyChunk(
  chunk: number[],
  carry: string,
): { display: Uint8Array; carry: string; meta: OscMeta } {
  const text = carry + new TextDecoder().decode(new Uint8Array(chunk));
  const meta = parseOscMeta(text);
  const cleaned = stripOscAndMarkers(text);

  // ponytail: only buffer split OSC/partial CSI; complete CSI must reach xterm for cursor moves
  const incomplete = incompleteEscapeSuffix(cleaned);
  if (incomplete) {
    return {
      display: new TextEncoder().encode(cleaned.slice(0, cleaned.length - incomplete.length)),
      carry: incomplete,
      meta,
    };
  }

  return {
    display: new TextEncoder().encode(cleaned),
    carry: "",
    meta,
  };
}

export function completionSuffix(prefix: string, candidate: string): string {
  if (candidate.startsWith(prefix)) return candidate.slice(prefix.length);
  return candidate;
}

// ponytail: dev-only self-check for OSC 779/780 decoding
if (import.meta.env.DEV) {
  const sample = "ls -la";
  const decoded = parseOscMeta(`\x1b]779;${btoa(sample)}\x07`).command;
  console.assert(decoded === sample, "OSC 779 decode failed");

  const completionPayload = btoa(
    JSON.stringify({ prefix: "git st", candidates: ["git status", "git stash"] }),
  );
  const completion = parseOscMeta(`\x1b]780;${completionPayload}\x07`);
  console.assert(completion.completionPrefix === "git st", "OSC 780 prefix failed");
  console.assert(completion.completions?.length === 2, "OSC 780 candidates failed");

  const enc = (s: string) => [...new TextEncoder().encode(s)];
  const dec = (u: Uint8Array) => new TextDecoder().decode(u);
  const csi = processPtyChunk(enc("> \x1b[3D"), "");
  console.assert(dec(csi.display).includes("\x1b[3D"), "CSI cursor seq must not be buffered");
  console.assert(csi.carry === "", "CSI must not land in carry");

  const oscPart = processPtyChunk(enc("x\x1b]7;file://"), "");
  console.assert(oscPart.carry.startsWith("\x1b]"), "incomplete OSC must buffer in carry");
  const oscDone = processPtyChunk(enc("host/path\x07"), oscPart.carry);
  console.assert(oscDone.carry === "", "complete OSC must flush carry");
}
