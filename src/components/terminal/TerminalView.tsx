import { useEffect, useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";
import { PaneControls } from "@/components/terminal/PaneControls";
import { useTabStore } from "@/stores/useTabStore";
import { cn } from "@/lib/utils";

export interface TerminalHandlers {
  rerun: (command: string) => void;
  insert: (command: string) => void;
  findNext: (query: string) => boolean;
  findPrevious: (query: string) => boolean;
}

interface TerminalViewProps {
  tabId: string;
  paneId: string;
  focused: boolean;
  active: boolean;
  onReady?: (key: string, handlers: TerminalHandlers) => void;
}

export function TerminalView({
  tabId,
  paneId,
  focused,
  active,
  onReady,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setFocusedPane = useTabStore((s) => s.setFocusedPane);
  const closePane = useTabStore((s) => s.closePane);
  const togglePaneMinimized = useTabStore((s) => s.togglePaneMinimized);
  const toggleBroadcast = useTabStore((s) => s.toggleBroadcast);
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));
  const pane = tab?.panes[paneId];
  const paneCount = tab ? Object.keys(tab.panes).length : 1;
  const showControls = paneCount > 1;
  const minimized = pane?.minimized ?? false;
  const terminalActive = active && !minimized;

  const {
    rerunCommand,
    insertCommand,
    findNext,
    findPrevious,
    focusTerminal,
  } = useTerminal(tabId, paneId, containerRef, terminalActive, focused);

  useEffect(() => {
    onReady?.(`${tabId}:${paneId}`, {
      rerun: rerunCommand,
      insert: insertCommand,
      findNext,
      findPrevious,
    });
  }, [tabId, paneId, onReady, rerunCommand, insertCommand, findNext, findPrevious]);

  const label =
    pane?.sshHost ??
    (pane?.branch && pane?.cwd
      ? `${pane.cwd} (${pane.branch})`
      : pane?.cwd ?? "~");

  return (
    <div
      className={cn(
        "flex flex-col",
        minimized ? "h-8 shrink-0 flex-none" : "min-h-0 flex-1",
        focused && "ring-1 ring-primary/30",
      )}
      onPointerDown={() => {
        setFocusedPane(tabId, paneId);
        focusTerminal();
      }}
    >
      {showControls ? (
        <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {label}
          </span>
          <PaneControls
            minimized={minimized}
            broadcast={tab?.broadcast}
            onToggleMinimize={() => togglePaneMinimized(tabId, paneId)}
            onToggleBroadcast={
              paneCount > 1 ? () => toggleBroadcast(tabId) : undefined
            }
            onClose={() => closePane(tabId, paneId)}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col px-1.5 pt-2 pb-2 sm:px-2",
          minimized && "hidden",
        )}
      >
        <div ref={containerRef} className="min-h-0 flex-1" />
      </div>
    </div>
  );
}
