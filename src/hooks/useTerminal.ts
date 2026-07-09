import { useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { Channel, invoke } from "@tauri-apps/api/core";
import { tauriReady, waitForTauri } from "@/lib/tauriWindow";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { openUrl } from "@tauri-apps/plugin-opener";
import "@xterm/xterm/css/xterm.css";
import { useTabStore } from "@/stores/useTabStore";
import { useCommandHistory } from "@/hooks/useCommandHistory";
import { useFishCompletions } from "@/hooks/useFishCompletions";
import {
  getTerminalFontFamily,
  useSettingsStore,
} from "@/stores/useSettingsStore";
import { getTerminalTheme } from "@/lib/theme";
import { processPtyChunk } from "@/lib/osc";
import { syncPaneGitBranch } from "@/lib/git";
import { notifyCommandComplete } from "@/lib/notifications";
import { registerTerminalLinks } from "@/lib/terminalLinks";
import { useEditorStore } from "@/stores/useEditorStore";
import {
  handleTerminalClipboardKey,
  installTerminalClipboard,
} from "@/lib/terminalClipboard";

type PtyEvent =
  | { type: "output"; data: number[] }
  | { type: "exit"; data: { code: number | null } };

const WISP_MARKER_TAIL = 32;
const WISP_START_MARKER = "\x1b]777;START\x07";
const WISP_EXIT_MARKER = /\x1b\]777;EXIT;(\d+)\x07/g;

function lastRunningRun(runs: { status: string; command: string }[]) {
  for (let i = runs.length - 1; i >= 0; i--) {
    if (runs[i].status === "running") return runs[i];
  }
  return undefined;
}

function scanShellMarkers(
  chunk: number[],
  tail: string,
  onRunning: () => void,
  onExit: (code: number) => void,
): string {
  const text = tail + new TextDecoder().decode(new Uint8Array(chunk));
  if (text.includes(WISP_START_MARKER)) onRunning();
  for (const match of text.matchAll(WISP_EXIT_MARKER)) {
    onExit(Number(match[1]));
  }
  return text.slice(-WISP_MARKER_TAIL);
}

function fitAndResize(
  term: Terminal,
  fitAddon: FitAddon,
  sessionId: string | null,
) {
  fitAddon.fit();
  if (sessionId) {
    void invoke("resize_terminal", {
      id: sessionId,
      cols: term.cols,
      rows: term.rows,
    });
  }
}

function chunkHasEsc(chunk: number[]): boolean {
  for (let i = 0; i < chunk.length; i++) {
    if (chunk[i] === 0x1b) return true;
  }
  return false;
}

function createWriteBatcher(term: Terminal) {
  const queue: Uint8Array[] = [];
  let rafId: number | null = null;

  const flush = () => {
    rafId = null;
    if (queue.length === 0) return;
    let total = 0;
    for (const part of queue) total += part.length;
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const part of queue) {
      merged.set(part, offset);
      offset += part.length;
    }
    queue.length = 0;
    term.write(merged);
  };

  return {
    write(data: Uint8Array) {
      if (data.length === 0) return;
      queue.push(data);
      if (rafId === null) rafId = requestAnimationFrame(flush);
    },
    flush,
    dispose() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      flush();
    },
  };
}

export function useTerminal(
  tabId: string,
  paneId: string,
  containerRef: React.RefObject<HTMLDivElement | null>,
  active: boolean,
  focused = false,
) {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const sessionRef = useRef<string | null>(null);
  const activeRef = useRef(active);
  const focusedRef = useRef(focused);
  const setPaneStatus = useTabStore((s) => s.setPaneStatus);
  const setPaneSessionId = useTabStore((s) => s.setPaneSessionId);
  const setPaneCwd = useTabStore((s) => s.setPaneCwd);
  const setPaneBranch = useTabStore((s) => s.setPaneBranch);
  const startCommandRun = useTabStore((s) => s.startCommandRun);
  const finishCommandRun = useTabStore((s) => s.finishCommandRun);
  const pane = useTabStore(
    useShallow((s) => s.tabs.find((t) => t.id === tabId)?.panes[paneId]),
  );
  const { recordCommand } = useCommandHistory(tabId, paneId);
  const terminalFontSize = useSettingsStore((s) => s.settings.terminalFontSize);
  const terminalFontFamily = useSettingsStore((s) => s.settings.terminalFontFamily);
  const terminalCursorBlink = useSettingsStore((s) => s.settings.terminalCursorBlink);
  const fishOverlayCompletions = useSettingsStore((s) => s.settings.fishOverlayCompletions);
  const fishAutosuggestions = useSettingsStore((s) => s.settings.fishAutosuggestions);
  const isSshSession = Boolean(pane?.sshHost);

  const fishCompletions = useFishCompletions();
  const {
    applyMeta,
    clear,
    selectNext,
    selectPrev,
    acceptSelected,
    acceptAtIndex,
    stateRef: completionRef,
  } = fishCompletions;

  const overlayEnabled =
    fishOverlayCompletions && !isSshSession;

  const overlayEnabledRef = useRef(overlayEnabled);
  const settingsRef = useRef({
    fishAutosuggestions,
    fishOverlayCompletions,
    terminalFontSize,
    terminalFontFamily,
    terminalCursorBlink,
  });
  overlayEnabledRef.current = overlayEnabled;
  settingsRef.current = {
    fishAutosuggestions,
    fishOverlayCompletions,
    terminalFontSize,
    terminalFontFamily,
    terminalCursorBlink,
  };

  activeRef.current = active;
  focusedRef.current = focused;

  const writeToTerminal = useCallback(async (data: string) => {
    const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
    if (tab?.broadcast) {
      const writes = Object.values(tab.panes)
        .map((p) => p.sessionId)
        .filter((id): id is string => Boolean(id))
        .map((id) => invoke("write_terminal", { id, data }));
      if (writes.length > 0) {
        await Promise.all(writes);
      }
      return;
    }
    const sessionId = sessionRef.current;
    if (!sessionId) return;
    await invoke("write_terminal", { id: sessionId, data });
  }, [tabId]);

  const focusTerminal = useCallback(() => {
    termRef.current?.focus();
  }, []);

  const rerunCommand = useCallback(
    async (command: string) => {
      await writeToTerminal(`${command}\r`);
      setPaneStatus(tabId, paneId, "running");
    },
    [writeToTerminal, setPaneStatus, tabId, paneId],
  );

  const insertCommand = useCallback(
    async (command: string) => {
      await writeToTerminal(command);
    },
    [writeToTerminal],
  );

  const findNext = useCallback((query: string) => {
    return searchRef.current?.findNext(query, { caseSensitive: false }) ?? false;
  }, []);

  const findPrevious = useCallback((query: string) => {
    return (
      searchRef.current?.findPrevious(query, { caseSensitive: false }) ?? false
    );
  }, []);

  const spawnPtyRef = useRef<(() => Promise<void>) | null>(null);

  const maybeNotifyComplete = useCallback(
    (command: string, code: number) => {
      const { tabs, activeTabId } = useTabStore.getState();
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;
      const foreground =
        activeTabId === tabId && activeRef.current && focusedRef.current;
      if (foreground) return;
      void notifyCommandComplete(tab.name, command, code === 0);
    },
    [tabId],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let effectDisposed = false;
    let cleanup: (() => void) | undefined;

    const mountTerminal = () => {
      if (effectDisposed || !containerRef.current) return;
      const mountContainer = containerRef.current;

    const term = new Terminal({
      cursorBlink: settingsRef.current.terminalCursorBlink,
      cursorStyle: "bar",
      cursorWidth: 2,
      cursorInactiveStyle: "outline",
      fontFamily: getTerminalFontFamily(settingsRef.current.terminalFontFamily),
      fontSize: settingsRef.current.terminalFontSize,
      letterSpacing: 0,
      theme: getTerminalTheme(),
      convertEol: true,
      scrollback: 5000,
      rightClickSelectsWord: true,
      macOptionIsMeta: true,
    });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(
      new WebLinksAddon((event, uri) => {
        event.preventDefault();
        void openUrl(uri);
      }),
    );
    registerTerminalLinks(term, {
      onPathClick: (path, kind) => {
        const editor = useEditorStore.getState();
        if (kind === "file") {
          void editor.openFile(tabId, path, { pin: true });
        } else {
          void editor.setRootPath(tabId, path);
          editor.toggleExpanded(tabId, path);
        }
      },
    });
    term.open(mountContainer);

    // ponytail: skip WebGL — canvas renderer keeps the blinking bar cursor reliable

    termRef.current = term;
    fitRef.current = fitAddon;
    searchRef.current = searchAddon;

    let disposed = false;
    let markerTail = "";
    let oscCarry = "";
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const writeBatcher = createWriteBatcher(term);

    const channel = new Channel<PtyEvent>();
    channel.onmessage = (msg) => {
      if (disposed) return;
      if (msg.type === "output") {
        if (!activeRef.current) return;

        let display: Uint8Array;
        let meta: ReturnType<typeof processPtyChunk>["meta"];
        if (!oscCarry && !chunkHasEsc(msg.data)) {
          display = new Uint8Array(msg.data);
          meta = {};
        } else {
          const parsed = processPtyChunk(msg.data, oscCarry);
          oscCarry = parsed.carry;
          display = parsed.display;
          meta = parsed.meta;
        }

        if (display.length > 0) writeBatcher.write(display);

        if (meta.cwd) {
          setPaneCwd(tabId, paneId, meta.cwd);
          if (meta.branch === undefined) {
            void syncPaneGitBranch(tabId, paneId, meta.cwd);
          }
        }
        if (meta.branch !== undefined) setPaneBranch(tabId, paneId, meta.branch);
        if (meta.command) {
          recordCommand(meta.command);
          startCommandRun(tabId, paneId, meta.command);
        }
        if (overlayEnabledRef.current && meta.completions !== undefined) {
          applyMeta(meta);
        }

        markerTail = scanShellMarkers(
          msg.data,
          markerTail,
          () => setPaneStatus(tabId, paneId, "running"),
          (code) => {
            const run = lastRunningRun(
              useTabStore.getState().tabs.find((t) => t.id === tabId)?.panes[paneId]
                ?.commandRuns ?? [],
            );
            finishCommandRun(tabId, paneId, code);
            if (run) maybeNotifyComplete(run.command, code);
            setPaneStatus(tabId, paneId, code === 0 ? "success" : "failed");
          },
        );
      } else if (msg.type === "exit") {
        const code = msg.data.code ?? 1;
        const run = lastRunningRun(
          useTabStore.getState().tabs.find((t) => t.id === tabId)?.panes[paneId]
            ?.commandRuns ?? [],
        );
        finishCommandRun(tabId, paneId, code);
        if (run) maybeNotifyComplete(run.command, code);
        setPaneStatus(tabId, paneId, code === 0 ? "success" : "failed");
      }
    };

    const spawnPty = async () => {
      if (disposed || sessionRef.current || !activeRef.current) return;
      try {
        const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
        const pane = tab?.panes[paneId];
        const cwd = pane?.cwd && pane.cwd !== "~" ? pane.cwd : null;
        const sessionId = await invoke<string>("spawn_terminal", {
          cwd,
          cols: term.cols,
          rows: term.rows,
          fishAutosuggestions: settingsRef.current.fishAutosuggestions,
          fishOverlayCompletions: settingsRef.current.fishOverlayCompletions,
          shell: pane?.shell && pane.shell !== "auto" ? pane.shell : null,
          env: pane?.env ?? null,
          onEvent: channel,
        });
        if (disposed) {
          await invoke("kill_terminal", { id: sessionId });
          return;
        }
        sessionRef.current = sessionId;
        setPaneSessionId(tabId, paneId, sessionId);
        if (pane?.cwd) void syncPaneGitBranch(tabId, paneId, pane.cwd);

        const initialCommand = pane?.initialCommand;
        if (initialCommand) {
          await invoke("write_terminal", {
            id: sessionId,
            data: `${initialCommand}\r`,
          });
          setPaneStatus(tabId, paneId, "running");
          startCommandRun(tabId, paneId, initialCommand);
        }

        fitAndResize(term, fitAddon, sessionId);
        if (focusedRef.current) term.focus();
      } catch (err) {
        term.writeln(`\r\n\x1b[31mFailed to spawn terminal: ${err}\x1b[0m`);
      }
    };

    spawnPtyRef.current = spawnPty;
    if (activeRef.current) void spawnPty();

    const disposeClipboard = installTerminalClipboard(term, mountContainer);

    term.attachCustomKeyEventHandler((event) => {
      if (!handleTerminalClipboardKey(event, term)) return false;

      if (!overlayEnabledRef.current || !completionRef.current.open) return true;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        selectNext();
        return false;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        selectPrev();
        return false;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        clear();
        return false;
      }
      if (event.key === "Enter" && completionRef.current.open) {
        event.preventDefault();
        void acceptSelected(writeToTerminal);
        return false;
      }
      if (event.key === "Tab" && !event.shiftKey && completionRef.current.open) {
        event.preventDefault();
        void acceptSelected(writeToTerminal);
        return false;
      }
      return true;
    });

    const onData = term.onData((data) => {
      void writeToTerminal(data);
      if (data.includes("\r") || data.includes("\n")) {
        clear();
        setPaneStatus(tabId, paneId, "running");
      }
    });

    const onResize = term.onResize(({ cols, rows }) => {
      const sessionId = sessionRef.current;
      if (sessionId) {
        void invoke("resize_terminal", { id: sessionId, cols, rows });
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (!activeRef.current) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitAndResize(term, fitAddon, sessionRef.current);
      }, 100);
    });
    resizeObserver.observe(mountContainer);

    const themeObserver = new MutationObserver(() => {
      term.options.theme = getTerminalTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-color-palette"],
    });

    cleanup = () => {
      disposed = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      writeBatcher.dispose();
      disposeClipboard();
      themeObserver.disconnect();
      onData.dispose();
      onResize.dispose();
      resizeObserver.disconnect();
      const sessionId = sessionRef.current;
      if (sessionId) void invoke("kill_terminal", { id: sessionId });
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      searchRef.current = null;
      sessionRef.current = null;
      clear();
    };
    };

    if (tauriReady()) mountTerminal();
    else void waitForTauri().then(() => {
      if (!effectDisposed) mountTerminal();
    });

    return () => {
      effectDisposed = true;
      cleanup?.();
    };
  }, [
    tabId,
    paneId,
    containerRef,
    setPaneStatus,
    setPaneSessionId,
    setPaneCwd,
    setPaneBranch,
    recordCommand,
    startCommandRun,
    finishCommandRun,
    maybeNotifyComplete,
    writeToTerminal,
    applyMeta,
    clear,
    selectNext,
    selectPrev,
    acceptSelected,
    completionRef,
  ]);

  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit) return;

    if (active && !sessionRef.current) {
      void spawnPtyRef.current?.();
    }

    if (active) {
      fitAndResize(term, fit, sessionRef.current);
    }
    if (active && focused) {
      term.focus();
    }
  }, [active, focused]);

  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term) return;

    term.options.fontSize = terminalFontSize;
    term.options.cursorBlink = terminalCursorBlink;
    term.options.cursorStyle = "bar";
    term.options.cursorWidth = 2;
    term.options.fontFamily = getTerminalFontFamily(
      terminalFontFamily,
    );
    if (active) fit?.fit();
  }, [
    active,
    terminalFontSize,
    terminalCursorBlink,
    terminalFontFamily,
  ]);

  return {
    rerunCommand,
    insertCommand,
    writeToTerminal,
    findNext,
    findPrevious,
    focusTerminal,
    fishCompletions,
    overlayEnabled,
    acceptAtIndex,
  };
}
