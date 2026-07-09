import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { GlobalSearchHandle } from "@/components/layout/GlobalSearch";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { TerminalHandlers } from "@/components/terminal/TerminalView";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTabStore } from "@/stores/useTabStore";
import { getFocusedPane } from "@/lib/layout";

const CommandPalette = lazy(() =>
  import("@/components/command-palette/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);
const SettingsDialog = lazy(() =>
  import("@/components/settings/SettingsDialog").then((m) => ({
    default: m.SettingsDialog,
  })),
);

function App() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handlersMap = useRef<Record<string, TerminalHandlers>>({});
  const globalSearchRef = useRef<GlobalSearchHandle>(null);

  const runActiveCommand = useCallback((command: string) => {
    const { tabs, activeTabId } = useTabStore.getState();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    const pane = getFocusedPane(tab);
    handlersMap.current[`${tab.id}:${pane.id}`]?.rerun(command);
  }, []);

  const broadcastRunCommand = useCallback((command: string) => {
    const { tabs, activeTabId } = useTabStore.getState();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    for (const pane of Object.values(tab.panes)) {
      handlersMap.current[`${tab.id}:${pane.id}`]?.rerun(command);
    }
  }, []);

  const insertActiveCommand = useCallback((command: string) => {
    const { tabs, activeTabId } = useTabStore.getState();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    const pane = getFocusedPane(tab);
    handlersMap.current[`${tab.id}:${pane.id}`]?.insert(command);
  }, []);

  useKeyboardShortcuts(
    () => setHistoryOpen(true),
    () => setSettingsOpen(true),
    () => setPaletteOpen(true),
    () => globalSearchRef.current?.focus(),
    () => setSearchOpen(true),
    () => {},
  );

  return (
    <TooltipProvider>
      <AppShell
        historyOpen={historyOpen}
        onHistoryOpenChange={setHistoryOpen}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        onSettingsOpenChange={setSettingsOpen}
        onRegisterTerminalHandler={(key, handlers) => {
          handlersMap.current[key] = handlers;
        }}
        globalSearchRef={globalSearchRef}
      />
      {paletteOpen ? (
        <Suspense fallback={null}>
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
            onRunCommand={runActiveCommand}
            onInsertCommand={insertActiveCommand}
            onBroadcastRun={broadcastRunCommand}
          />
        </Suspense>
      ) : null}
      {settingsOpen ? (
        <Suspense fallback={null}>
          <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </Suspense>
      ) : null}
    </TooltipProvider>
  );
}

export default App;
