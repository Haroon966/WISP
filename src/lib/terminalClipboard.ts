import type { Terminal } from "@xterm/xterm";

export function isTerminalFocused(): boolean {
  const active = document.activeElement;
  return (
    active instanceof Element &&
    active.classList.contains("xterm-helper-textarea")
  );
}

async function copySelection(term: Terminal): Promise<boolean> {
  const selection = term.getSelection();
  if (!selection) return false;
  await navigator.clipboard.writeText(selection);
  return true;
}

async function pasteClipboard(term: Terminal): Promise<void> {
  const text = await navigator.clipboard.readText();
  if (text) term.paste(text);
}

/** Return false to stop xterm from handling the key. */
export function handleTerminalClipboardKey(
  event: KeyboardEvent,
  term: Terminal,
): boolean {
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key;

  if (mod && event.shiftKey && key.toLowerCase() === "c") {
    if (!term.hasSelection()) return true;
    event.preventDefault();
    void copySelection(term);
    return false;
  }

  if (mod && key === "Insert") {
    if (!term.hasSelection()) return true;
    event.preventDefault();
    void copySelection(term);
    return false;
  }

  if (
    (mod && event.shiftKey && key.toLowerCase() === "v") ||
    (event.shiftKey && key === "Insert")
  ) {
    event.preventDefault();
    void pasteClipboard(term);
    return false;
  }

  if (mod && !event.shiftKey && key.toLowerCase() === "c" && term.hasSelection()) {
    event.preventDefault();
    void copySelection(term);
    return false;
  }

  return true;
}

export function installTerminalClipboard(
  term: Terminal,
  container: HTMLElement,
): () => void {
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    if (term.hasSelection()) {
      void copySelection(term);
      term.clearSelection();
      return;
    }
    void pasteClipboard(term);
  };

  const onMouseDown = (event: MouseEvent) => {
    if (event.button !== 1) return;
    event.preventDefault();
    void pasteClipboard(term);
  };

  container.addEventListener("contextmenu", onContextMenu);
  container.addEventListener("mousedown", onMouseDown);

  return () => {
    container.removeEventListener("contextmenu", onContextMenu);
    container.removeEventListener("mousedown", onMouseDown);
  };
}
