import { useCallback } from "react";
import { PanelRightCloseIcon } from "lucide-react";
import { PanelShell } from "@/components/layout/PanelShell";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { FileTree } from "@/components/explorer/FileTree";
import { useFsWatch } from "@/lib/fsWatch";
import { tabNameFromCwd } from "@/lib/folders";
import { useEditorStore } from "@/stores/useEditorStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { invalidateMediaCache } from "@/lib/mediaCache";
import { useTabStore } from "@/stores/useTabStore";
import { cn } from "@/lib/utils";

interface ExplorerPanelProps {
  compact?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export function ExplorerPanel({
  compact = false,
  open = true,
  onClose,
}: ExplorerPanelProps) {
  const explorerOpen = useSettingsStore((s) => s.settings.explorerOpen);
  const explorerWidthPx = useSettingsStore((s) => s.settings.explorerWidthPx);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const activeTabId = useTabStore((s) => s.activeTabId);
  const editorState = useEditorStore((s) =>
    activeTabId ? s.byTabId[activeTabId] : undefined,
  );
  const handleExternalChange = useEditorStore((s) => s.handleExternalChange);

  const rootPath = editorState?.rootPath ?? "~";
  const watchId = editorState?.watchId;

  useFsWatch(watchId, (payload) => {
    if (!activeTabId) return;
    for (const p of payload.paths) {
      invalidateMediaCache(p);
    }
    void handleExternalChange(activeTabId, payload.paths);
  });

  const onResize = useCallback(
    (delta: number) => {
      const next = Math.min(560, Math.max(180, explorerWidthPx - delta));
      updateSettings({ explorerWidthPx: next });
    },
    [explorerWidthPx, updateSettings],
  );

  const collapse = () => {
    updateSettings({ explorerOpen: false });
    onClose?.();
  };

  if (!explorerOpen) return null;
  if (compact && !open) return null;

  const panel = (
    <PanelShell
      side="right"
      title={tabNameFromCwd(rootPath)}
      onCollapse={collapse}
      style={{ width: explorerWidthPx }}
      className={cn(compact && "absolute inset-y-0 right-0 z-50 shadow-xl")}
      resizeHandle={
        <ResizeHandle
          direction="horizontal"
          onDrag={onResize}
          ariaLabel="Resize explorer"
          className="absolute inset-y-0 left-0 z-10 -translate-x-1/2"
        />
      }
    >
      {activeTabId && editorState ? (
        <FileTree tabId={activeTabId} rootPath={rootPath} />
      ) : null}
    </PanelShell>
  );

  return panel;
}

export function ExplorerToggleButton({ onOpen }: { onOpen?: () => void }) {
  const explorerOpen = useSettingsStore((s) => s.settings.explorerOpen);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <button
      type="button"
      className={cn(
        "rounded p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        explorerOpen && "bg-muted/40 text-foreground",
      )}
      aria-label="Toggle file explorer"
      onClick={() => {
        const next = !explorerOpen;
        updateSettings({ explorerOpen: next });
        if (next) onOpen?.();
      }}
    >
      <PanelRightCloseIcon className="size-4" />
    </button>
  );
}
