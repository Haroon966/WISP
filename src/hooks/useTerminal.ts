import { useCallback, useEffect, useRef } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useTabStore } from "@/stores/useTabStore";
import { useCommandHistory } from "@/hooks/useCommandHistory";
import { getTerminalTheme } from "@/lib/theme";
import { processPtyChunk } from "@/lib/osc";

type PtyEvent =
  | { type: "output"; data: number[] }
  | { type: "exit"; data: { code: number | null } };

const WISP_MARKER_TAIL = 32;
const WISP_START_MARKER = "\x1b]777;START\x07";
const WISP_EXIT_MARKER = /\x1b\]777;EXIT;(\d+)\x07/g;

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

export function useTerminal(tabId: string, containerRef: React.RefObject<HTMLDivElement | null>) {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionRef = useRef<string | null>(null);
  const inputBufferRef = useRef("");
  const setTabStatus = useTabStore((s) => s.setTabStatus);
  const setTabSessionId = useTabStore((s) => s.setTabSessionId);
  const setTabCwd = useTabStore((s) => s.setTabCwd);
  const setTabBranch = useTabStore((s) => s.setTabBranch);
  const { recordCommand } = useCommandHistory(tabId);

  const writeToTerminal = useCallback(async (data: string) => {
    const sessionId = sessionRef.current;
    if (!sessionId) return;
    await invoke("write_terminal", { id: sessionId, data });
  }, []);

  const rerunCommand = useCallback(
    async (command: string) => {
      await writeToTerminal(`${command}\r`);
      recordCommand(command);
      setTabStatus(tabId, "running");
    },
    [writeToTerminal, recordCommand, setTabStatus, tabId],
  );

  const insertCommand = useCallback(
    async (command: string) => {
      await writeToTerminal(command);
    },
    [writeToTerminal],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "var(--font-mono), JetBrains Mono, monospace",
      fontSize: 14,
      theme: getTerminalTheme(),
      convertEol: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    let disposed = false;
    let markerTail = "";
    let oscCarry = "";

    const channel = new Channel<PtyEvent>();
    channel.onmessage = (msg) => {
      if (disposed) return;
      if (msg.type === "output") {
        const { display, carry, meta } = processPtyChunk(msg.data, oscCarry);
        oscCarry = carry;
        if (display.length > 0) term.write(display);

        if (meta.cwd) setTabCwd(tabId, meta.cwd);
        if (meta.branch !== undefined) setTabBranch(tabId, meta.branch);

        markerTail = scanShellMarkers(
          msg.data,
          markerTail,
          () => setTabStatus(tabId, "running"),
          (code) => setTabStatus(tabId, code === 0 ? "success" : "neutral"),
        );
      } else if (msg.type === "exit") {
        setTabStatus(tabId, msg.data.code === 0 ? "success" : "neutral");
      }
    };

    const init = async () => {
      try {
        const sessionId = await invoke<string>("spawn_terminal", {
          cwd: null,
          cols: term.cols,
          rows: term.rows,
          onEvent: channel,
        });
        if (disposed) {
          await invoke("kill_terminal", { id: sessionId });
          return;
        }
        sessionRef.current = sessionId;
        setTabSessionId(tabId, sessionId);
      } catch (err) {
        term.writeln(`\r\n\x1b[31mFailed to spawn terminal: ${err}\x1b[0m`);
      }
    };

    void init();

    const onData = term.onData((data) => {
      void writeToTerminal(data);
      if (data === "\r" || data === "\n") {
        recordCommand(inputBufferRef.current);
        inputBufferRef.current = "";
        setTabStatus(tabId, "running");
      } else if (data === "\u007f") {
        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
      } else if (data >= " " || data === "\t") {
        inputBufferRef.current += data;
      }
    });

    const onResize = term.onResize(({ cols, rows }) => {
      const sessionId = sessionRef.current;
      if (sessionId) {
        void invoke("resize_terminal", { id: sessionId, cols, rows });
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    const themeObserver = new MutationObserver(() => {
      term.options.theme = getTerminalTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      disposed = true;
      themeObserver.disconnect();
      onData.dispose();
      onResize.dispose();
      resizeObserver.disconnect();
      const sessionId = sessionRef.current;
      if (sessionId) void invoke("kill_terminal", { id: sessionId });
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      sessionRef.current = null;
    };
  }, [
    tabId,
    containerRef,
    setTabStatus,
    setTabSessionId,
    setTabCwd,
    setTabBranch,
    recordCommand,
    writeToTerminal,
  ]);

  return { rerunCommand, insertCommand, writeToTerminal };
}

import type React from "react";
