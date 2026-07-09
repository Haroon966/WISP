import { useCallback, useState, type RefObject } from "react";
import { HistoryIcon, PanelLeftIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GlobalSearch,
  type GlobalSearchHandle,
} from "@/components/layout/GlobalSearch";
import { WindowControls } from "@/components/layout/WindowControls";
import { CommandHistoryDropdown } from "@/components/terminal/CommandHistoryDropdown";
import type { TerminalHandlers } from "@/components/terminal/TerminalView";
import { ExplorerToggleButton } from "@/components/explorer/ExplorerPanel";
import { useWindowMaximized } from "@/hooks/useWindowMaximized";
import { getFocusedPane } from "@/lib/layout";
import { useTabStore } from "@/stores/useTabStore";

interface AppToolbarProps {
  compact?: boolean;
  onOpenSidebar?: () => void;
  globalQuery: string;
  onGlobalQueryChange: (query: string) => void;
  globalSearchRef?: RefObject<GlobalSearchHandle | null>;
  onGlobalNavigate?: () => void;
  historyOpen?: boolean;
  onHistoryOpenChange?: (open: boolean) => void;
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  onOpenExplorer?: () => void;
  terminalHandlersRef?: React.RefObject<Record<string, TerminalHandlers>>;
}

export function AppToolbar({
  compact = false,
  onOpenSidebar,
  globalQuery,
  onGlobalQueryChange,
  globalSearchRef,
  onGlobalNavigate,
  historyOpen: historyOpenProp,
  onHistoryOpenChange,
  searchOpen: searchOpenProp,
  onSearchOpenChange,
  onOpenExplorer,
  terminalHandlersRef,
}: AppToolbarProps) {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const focusedPane = activeTab ? getFocusedPane(activeTab) : null;
  const isMaximized = useWindowMaximized();

  const [historyOpenLocal, setHistoryOpenLocal] = useState(false);
  const [searchOpenLocal, setSearchOpenLocal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const historyOpen = historyOpenProp ?? historyOpenLocal;
  const setHistoryOpen = onHistoryOpenChange ?? setHistoryOpenLocal;
  const searchOpen = searchOpenProp ?? searchOpenLocal;
  const setSearchOpen = onSearchOpenChange ?? setSearchOpenLocal;

  const handlerKey =
    activeTab && focusedPane ? `${activeTab.id}:${focusedPane.id}` : null;
  const activeHandlers = handlerKey
    ? terminalHandlersRef?.current[handlerKey]
    : null;

  const runSearch = useCallback(
    (direction: "next" | "prev") => {
      if (!searchQuery || !activeHandlers) return;
      if (direction === "next") activeHandlers.findNext(searchQuery);
      else activeHandlers.findPrevious(searchQuery);
    },
    [searchQuery, activeHandlers],
  );

  return (
    <header
      className="relative z-30 flex h-11 shrink-0 items-center gap-2 border-b border-border/60 bg-card/20 px-2 sm:gap-3 sm:px-3"
      data-tauri-drag-region
    >
      {compact ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 cursor-pointer"
          onClick={() => onOpenSidebar?.()}
          aria-label="Open sessions"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <PanelLeftIcon />
        </Button>
      ) : null}

      <div
        className="flex shrink-0 items-center gap-2"
        data-tauri-drag-region
      >
        <img
          src="/wisp.png"
          alt=""
          className="size-6 shrink-0 rounded-md shadow-sm sm:size-7 sm:rounded-lg"
          aria-hidden
        />
        <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
          Wisp
        </span>
      </div>

      <div
        className="min-w-0 flex-1 px-1 sm:max-w-md sm:px-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <GlobalSearch
          ref={globalSearchRef}
          query={globalQuery}
          onQueryChange={onGlobalQueryChange}
          onNavigate={onGlobalNavigate}
        />
      </div>

      {activeTab ? (
        <span
          className="hidden min-w-0 max-w-28 truncate text-sm font-medium text-foreground md:inline lg:max-w-40"
          data-tauri-drag-region
          title={activeTab.name}
        >
          {activeTab.name}
          {activeTab.broadcast ? (
            <span className="ml-1.5 text-xs text-primary">broadcast</span>
          ) : null}
        </span>
      ) : null}

      <div
        className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {activeTab && focusedPane ? (
          <>
            {searchOpen ? (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      runSearch(e.shiftKey ? "prev" : "next");
                    }
                    if (e.key === "Escape") {
                      setSearchOpen(false);
                      setSearchQuery("");
                    }
                  }}
                  placeholder="Find..."
                  className="h-8 w-20 text-xs sm:w-36"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden px-2 sm:inline-flex"
                  onClick={() => runSearch("prev")}
                  disabled={!searchQuery}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden px-2 sm:inline-flex"
                  onClick={() => runSearch("next")}
                  disabled={!searchQuery}
                >
                  Next
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  aria-label="Close search"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size={compact ? "icon-sm" : "sm"}
                className="cursor-pointer"
                onClick={() => setSearchOpen(true)}
                aria-label="Find in terminal"
              >
                <SearchIcon data-icon={compact ? undefined : "inline-start"} />
                <span className="hidden sm:inline">Find</span>
              </Button>
            )}
            <ExplorerToggleButton onOpen={onOpenExplorer} />
            <CommandHistoryDropdown
              tabId={activeTab.id}
              paneId={focusedPane.id}
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              onRerun={(cmd) =>
                handlerKey && terminalHandlersRef?.current[handlerKey]?.rerun(cmd)
              }
              onInsert={(cmd) =>
                handlerKey && terminalHandlersRef?.current[handlerKey]?.insert(cmd)
              }
              trigger={
                <Button
                  variant="ghost"
                  size={compact ? "icon-sm" : "sm"}
                  aria-label="Command history"
                >
                  <HistoryIcon data-icon={compact ? undefined : "inline-start"} />
                  <span className="hidden sm:inline">History</span>
                </Button>
              }
            />
          </>
        ) : null}
        <WindowControls isMaximized={isMaximized} />
      </div>
    </header>
  );
}
