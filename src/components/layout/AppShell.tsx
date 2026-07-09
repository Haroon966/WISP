import { useEffect, useRef, useState, type RefObject } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainPanel } from "@/components/layout/MainPanel";
import { AppToolbar } from "@/components/layout/AppToolbar";
import type { GlobalSearchHandle } from "@/components/layout/GlobalSearch";
import type { TerminalHandlers } from "@/components/terminal/TerminalView";
import { ExplorerPanel } from "@/components/explorer/ExplorerPanel";
import { COMPACT_LAYOUT_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";

interface AppShellProps {
  historyOpen?: boolean;
  onHistoryOpenChange?: (open: boolean) => void;
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  onSettingsOpenChange?: (open: boolean) => void;
  onRegisterTerminalHandler?: (key: string, handlers: TerminalHandlers) => void;
  globalSearchRef?: RefObject<GlobalSearchHandle | null>;
}

export function AppShell({
  historyOpen,
  onHistoryOpenChange,
  searchOpen,
  onSearchOpenChange,
  onSettingsOpenChange,
  onRegisterTerminalHandler,
  globalSearchRef,
}: AppShellProps) {
  const compact = useMediaQuery(COMPACT_LAYOUT_QUERY);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const localSearchRef = useRef<GlobalSearchHandle>(null);
  const searchRef = globalSearchRef ?? localSearchRef;
  const handlersMap = useRef<Record<string, TerminalHandlers>>({});

  useEffect(() => {
    if (!compact) {
      setSidebarOpen(false);
      setExplorerOpen(false);
    }
  }, [compact]);

  useEffect(() => {
    if (!compact || !sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact, sidebarOpen]);

  const closeSidebar = () => setSidebarOpen(false);

  const onTerminalReady = (key: string, handlers: TerminalHandlers) => {
    handlersMap.current[key] = handlers;
    onRegisterTerminalHandler?.(key, handlers);
  };

  return (
    <div className="wisp-frame relative flex h-screen min-h-0 w-screen flex-col overflow-hidden rounded-lg border border-border/80 bg-background ring-1 ring-foreground/5 sm:rounded-xl">
      <AppToolbar
        compact={compact}
        onOpenSidebar={() => setSidebarOpen(true)}
        globalQuery={globalQuery}
        onGlobalQueryChange={setGlobalQuery}
        globalSearchRef={searchRef}
        onGlobalNavigate={closeSidebar}
        historyOpen={historyOpen}
        onHistoryOpenChange={onHistoryOpenChange}
        searchOpen={searchOpen}
        onSearchOpenChange={onSearchOpenChange}
        onOpenExplorer={() => setExplorerOpen(true)}
        terminalHandlersRef={handlersMap}
      />

      <div className="relative flex min-h-0 flex-1">
        {compact && sidebarOpen ? (
          <button
            type="button"
            className="absolute inset-0 z-40 cursor-default bg-black/45 backdrop-blur-[1px]"
            aria-label="Close sidebar"
            onClick={closeSidebar}
          />
        ) : null}
        <Sidebar
          compact={compact}
          open={sidebarOpen}
          onClose={closeSidebar}
          onOpenSettings={() => {
            closeSidebar();
            onSettingsOpenChange?.(true);
          }}
          onSessionSelect={closeSidebar}
          searchQuery={globalQuery}
        />
        <MainPanel onRegisterTerminalHandler={onTerminalReady} />
        {compact && explorerOpen ? (
          <button
            type="button"
            className="absolute inset-0 z-40 cursor-default bg-black/45 backdrop-blur-[1px]"
            aria-label="Close explorer"
            onClick={() => setExplorerOpen(false)}
          />
        ) : null}
        <ExplorerPanel
          compact={compact}
          open={explorerOpen || !compact}
          onClose={() => setExplorerOpen(false)}
        />
      </div>
    </div>
  );
}
