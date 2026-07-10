export type OscMeta = {
  cwd?: string;
  command?: string;
  exitCode?: number;
  started?: boolean;
};

const WISP_OSC_CODES = new Set(["7", "777", "778", "779", "780"]);
const OSC_RE = /\x1b\](\d+);([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
const WISP_START = "\x1b]777;START\x07";
const WISP_EXIT_RE = /\x1b\]777;EXIT;(\d+)\x07/g;
// ponytail: ceiling for split integration OSC; beyond this, flush carry so prompt cannot stall
const MAX_CARRY_CHARS = 256;

function decodeBase64Command(payload: string): string | undefined {
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
  if (text.includes(WISP_START)) meta.started = true;
  for (const match of text.matchAll(OSC_RE)) {
    const code = match[1];
    if (!WISP_OSC_CODES.has(code)) continue;
    const payload = match[2];
    if (code === "7") {
      const path = fileUrlToPath(payload);
      if (path) meta.cwd = formatHomePath(path);
    } else if (code === "779") {
      const command = decodeBase64Command(payload);
      if (command) meta.command = command;
    }
  }
  for (const match of text.matchAll(WISP_EXIT_RE)) {
    meta.exitCode = Number(match[1]);
  }
  return meta;
}

function stripWispOsc(text: string): string {
  return text.replace(OSC_RE, (seq, code: string) =>
    WISP_OSC_CODES.has(code) ? "" : seq,
  );
}

export function stripOscAndMarkers(text: string): string {
  return stripWispOsc(text)
    .replace(new RegExp(WISP_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "")
    .replace(/\x1b\]777;EXIT;\d+\x07/g, "")
    // ponytail: fish omitted-newline glyph confuses xterm.js width; shell still owns the prompt
    .replace(/\u2424|\u23ce/g, "");
}

/** Trailing Wisp OSC (ESC ]) without BEL/ST terminator. */
function incompleteOscSuffix(text: string): string | null {
  const idx = text.lastIndexOf("\x1b]");
  if (idx === -1) return null;
  const tail = text.slice(idx);
  if (/(?:\x07|\x1b\\)/.test(tail)) return null;
  const code = tail.match(/^\x1b\](\d+)/);
  if (!code || !WISP_OSC_CODES.has(code[1])) return null;
  return tail;
}

/** ESC or partial CSI waiting for the next chunk. */
function incompleteEscapeSuffix(text: string): string | null {
  const osc = incompleteOscSuffix(text);
  if (osc) return osc;
  if (text.endsWith("\x1b")) return "\x1b";
  const partialCsi = text.match(/\x1b\[[0-9;?]*$/);
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

  const incomplete = incompleteEscapeSuffix(cleaned);
  if (incomplete) {
    if (incomplete.length > MAX_CARRY_CHARS) {
      return {
        display: new TextEncoder().encode(cleaned),
        carry: "",
        meta,
      };
    }
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

// ponytail: dev-only self-check for OSC decoding
if (import.meta.env.DEV) {
  const sample = "ls -la";
  const decoded = parseOscMeta(`\x1b]779;${btoa(sample)}\x07`).command;
  console.assert(decoded === sample, "OSC 779 decode failed");
  console.assert(parseOscMeta(WISP_START).started === true, "OSC 777 START failed");

  const enc = (s: string) => [...new TextEncoder().encode(s)];
  const dec = (u: Uint8Array) => new TextDecoder().decode(u);
  const csi = processPtyChunk(enc("> \x1b[3D"), "");
  console.assert(dec(csi.display).includes("\x1b[3D"), "CSI cursor seq must not be buffered");
  console.assert(csi.carry === "", "CSI must not land in carry");

  const oscPart = processPtyChunk(enc("x\x1b]7;file://"), "");
  console.assert(oscPart.carry.startsWith("\x1b]"), "incomplete OSC must buffer in carry");
  const oscDone = processPtyChunk(enc("host/path\x07"), oscPart.carry);
  console.assert(oscDone.carry === "", "complete OSC must flush carry");

  const fish = processPtyChunk(enc("ok\u2424prompt"), "");
  console.assert(!dec(fish.display).includes("\u2424"), "fish omitted-newline char must be stripped");

  const passthrough = processPtyChunk(enc("hi\x1b]1337;foo\x07"), "");
  console.assert(dec(passthrough.display).includes("1337"), "non-wisp OSC must pass through");

  const stuck = processPtyChunk(enc("y"), "\x1b]7;" + "x".repeat(MAX_CARRY_CHARS));
  console.assert(stuck.carry === "", "oversized carry must flush");
}
