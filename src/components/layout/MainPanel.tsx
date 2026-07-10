import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { HistoryIcon, PlusIcon, TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandHistoryDropdown } from "@/components/terminal/CommandHistoryDropdown";
import { SplitLayout } from "@/components/layout/SplitLayout";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { EditorTabBar } from "@/components/editor/EditorTabBar";
import type { TerminalHandlers } from "@/components/terminal/TerminalView";
import { useEditorStore } from "@/stores/useEditorStore";
import { useTabStore } from "@/stores/useTabStore";
import { getFocusedPane } from "@/lib/layout";

const EditorPane = lazy(() =>
  import("@/components/editor/EditorPane").then((m) => ({
    default: m.EditorPane,
  })),
);

interface MainPanelProps {
  onRegisterTerminalHandler?: (key: string, handlers: TerminalHandlers) => void;
}

function TabContent({
  tabId,
  active,
  onTerminalReady,
}: {
  tabId: string;
  active: boolean;
  onTerminalReady?: (key: string, handlers: TerminalHandlers) => void;
}) {
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));
  const editorState = useEditorStore((s) => s.byTabId[tabId]);
  const closeFile = useEditorStore((s) => s.closeFile);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const setEditorTerminalSizes = useEditorStore((s) => s.setEditorTerminalSizes);

  const sizes = editorState?.editorTerminalSizes ?? [1, 1];
  const files = editorState?.files ?? [];
  const activeFile =
    editorState?.files.find((f) => f.id === editorState.activeFileId) ?? null;
  const hasEditor = files.length > 0;

  const handleCloseFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file?.dirty && !window.confirm(`Discard unsaved changes to ${file.path.split("/").pop()}?`)) {
      return;
    }
    closeFile(tabId, fileId, true);
  };

  const handleEditorTerminalDrag = useCallback(
    (delta: number) => {
      const total = sizes[0] + sizes[1];
      const flexDelta = (delta / 300) * total;
      const next: [number, number] = [
        Math.max(0.15, sizes[0] + flexDelta),
        Math.max(0.15, sizes[1] - flexDelta),
      ];
      setEditorTerminalSizes(tabId, next);
    },
    [sizes, setEditorTerminalSizes, tabId],
  );

  if (!tab) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hasEditor ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
          <div
            className="flex min-h-0 min-w-0 flex-col"
            style={{ flex: sizes[0] }}
          >
            <SplitLayout
              tab={tab}
              active={active}
              onTerminalReady={onTerminalReady}
            />
          </div>
          <ResizeHandle
            direction="horizontal"
            onDrag={handleEditorTerminalDrag}
            ariaLabel="Resize terminal and preview"
            className="max-md:hidden"
          />
          <ResizeHandle
            direction="vertical"
            onDrag={handleEditorTerminalDrag}
            ariaLabel="Resize terminal and preview"
            className="md:hidden"
          />
          <div
            className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background"
            style={{ flex: sizes[1] }}
          >
            <EditorTabBar
              files={files}
              activeFileId={editorState?.activeFileId ?? null}
              onSelect={(id) => setActiveFile(tabId, id)}
              onClose={handleCloseFile}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <Suspense fallback={null}>
                <EditorPane tabId={tabId} file={activeFile} />
              </Suspense>
            </div>
          </div>
        </div>
      ) : (
        <SplitLayout tab={tab} active={active} onTerminalReady={onTerminalReady} />
      )}
    </div>
  );
}

export function MainPanel({ onRegisterTerminalHandler }: MainPanelProps) {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const focusedPane = activeTab ? getFocusedPane(activeTab) : null;

  const handlersMap = useRef<Record<string, TerminalHandlers>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const onTerminalReady = useCallback(
    (key: string, handlers: TerminalHandlers) => {
      handlersMap.current[key] = handlers;
      onRegisterTerminalHandler?.(key, handlers);
    },
    [onRegisterTerminalHandler],
  );

  if (!activeTab || !focusedPane) {
    return (
      <main className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/60">
            <TerminalIcon className="size-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No session selected</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Create a new terminal session or pick one from the sidebar.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button className="cursor-pointer" onClick={() => addTab()}>
              <PlusIcon data-icon="inline-start" />
              New session
            </Button>
            <CommandHistoryDropdown
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              trigger={
                <Button variant="outline" className="cursor-pointer">
                  <HistoryIcon data-icon="inline-start" />
                  History
                </Button>
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            <kbd className="kbd">Ctrl+T</kbd> new
            <span className="hidden sm:inline">
              {" "}
              · <kbd className="kbd">Ctrl+K</kbd> command palette
            </span>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="relative flex min-h-0 flex-1 flex-col">
        {activeTabId ? (
          <TabContent
            key={activeTabId}
            tabId={activeTabId}
            active
            onTerminalReady={onTerminalReady}
          />
        ) : null}
      </div>
    </main>
  );
}
