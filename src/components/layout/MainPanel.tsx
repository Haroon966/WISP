import { useCallback, useRef, useState } from "react";
import { HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CommandHistoryDropdown } from "@/components/terminal/CommandHistoryDropdown";
import { TerminalView } from "@/components/terminal/TerminalView";
import { useTabStore } from "@/stores/useTabStore";
import { cn } from "@/lib/utils";

interface MainPanelProps {
  historyOpen?: boolean;
  onHistoryOpenChange?: (open: boolean) => void;
}

export function MainPanel({
  historyOpen: historyOpenProp,
  onHistoryOpenChange,
}: MainPanelProps) {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [historyOpenLocal, setHistoryOpenLocal] = useState(false);
  const historyOpen = historyOpenProp ?? historyOpenLocal;
  const setHistoryOpen = onHistoryOpenChange ?? setHistoryOpenLocal;

  const handlersMap = useRef<
    Record<string, { rerun: (command: string) => void; insert: (command: string) => void }>
  >({});

  const onTerminalReady = useCallback(
    (
      tabId: string,
      handlers: { rerun: (command: string) => void; insert: (command: string) => void },
    ) => {
      handlersMap.current[tabId] = handlers;
    },
    [],
  );

  if (!activeTab) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background text-muted-foreground">
        Select or create a tab
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 px-3">
        <span className="text-sm font-medium text-foreground">
          {activeTab.name}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <CommandHistoryDropdown
            tabId={activeTab.id}
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            onRerun={(cmd) => handlersMap.current[activeTab.id]?.rerun(cmd)}
            onInsert={(cmd) => handlersMap.current[activeTab.id]?.insert(cmd)}
            trigger={
              <Button variant="ghost" size="sm">
                <HistoryIcon data-icon="inline-start" />
                History
              </Button>
            }
          />
        </div>
      </div>
      <Separator />
      <div className="relative min-h-0 flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "absolute inset-0 flex flex-col",
              tab.id !== activeTabId && "pointer-events-none invisible",
            )}
          >
            <TerminalView tabId={tab.id} onReady={onTerminalReady} />
          </div>
        ))}
      </div>
    </main>
  );
}
