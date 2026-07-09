import { memo, useEffect, useRef, useState } from "react";
import { ServerIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFolderIcon } from "@/lib/folders";
import { getTabDisplayMeta } from "@/stores/useTabStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTabStore } from "@/stores/useTabStore";
import type { Tab, TabStatus } from "@/types/tab";

const statusBorder: Record<TabStatus, string> = {
  neutral: "",
  running: "border-status-running/50 bg-status-running/10",
  success: "border-status-success/40 bg-status-success/10",
  failed: "border-destructive/40 bg-destructive/10",
};

const statusLabels: Record<TabStatus, string> = {
  neutral: "Idle",
  running: "Running",
  success: "Done",
  failed: "Failed",
};

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  iconOnly?: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function sessionSubtitle(tab: Tab): string {
  const { branch, cwd, sshHost } = getTabDisplayMeta(tab);
  if (sshHost) return sshHost;
  const path = cwd ?? "~";
  return branch ? `${path} (${branch})` : path;
}

export const TabItem = memo(function TabItem({
  tab,
  isActive,
  iconOnly = false,
  onSelect,
  onClose,
}: TabItemProps) {
  const { cwd, status, sshHost } = getTabDisplayMeta(tab);
  const FolderIcon = sshHost ? ServerIcon : getFolderIcon(cwd);
  const renamingTabId = useTabStore((s) => s.renamingTabId);
  const renameTab = useTabStore((s) => s.renameTab);
  const setRenamingTabId = useTabStore((s) => s.setRenamingTabId);
  const isRenaming = renamingTabId === tab.id;
  const [draft, setDraft] = useState(tab.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const tooltip = `${tab.name} · ${sessionSubtitle(tab)} · ${statusLabels[status]}`;

  useEffect(() => {
    if (isRenaming) {
      setDraft(tab.name);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming, tab.name]);

  const commitRename = () => {
    if (draft.trim()) renameTab(tab.id, draft);
    else setRenamingTabId(null);
  };

  if (iconOnly) {
    return (
      <div
        className={cn(
          "group relative flex justify-center rounded-xl border transition-colors duration-200",
          statusBorder[status],
          isActive
            ? status === "neutral" &&
                "border-sidebar-primary/40 bg-sidebar-accent shadow-sm ring-1 ring-sidebar-primary/20"
            : "border-transparent",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          title={tooltip}
          aria-label={`${tab.name}, ${statusLabels[status]}`}
          className={cn(
            "relative flex size-10 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200",
            "hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          )}
        >
          <FolderIcon
            className={cn(
              "size-5 shrink-0 transition-colors duration-200",
              isActive ? "text-sidebar-primary" : "text-sidebar-muted",
            )}
          />
          {status !== "neutral" ? (
            <span
              className={cn(
                "status-dot absolute top-1.5 right-1.5",
                status === "running" && "status-dot--running",
                status === "success" && "status-dot--success",
                status === "failed" && "status-dot--failed",
              )}
              aria-hidden
            />
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex items-center gap-0.5 rounded-xl border pr-1 transition-colors duration-200",
        statusBorder[status],
        isActive
          ? status === "neutral" &&
              "border-sidebar-primary/40 bg-sidebar-accent shadow-sm ring-1 ring-sidebar-primary/20"
          : "border-transparent",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={(e) => {
          e.preventDefault();
          setRenamingTabId(tab.id);
        }}
        title={`${statusLabels[status]} · double-click to rename`}
        aria-label={`${tab.name}, ${statusLabels[status]}`}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-200",
          "hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        )}
      >
        <FolderIcon
          className={cn(
            "size-5 shrink-0 transition-colors duration-200",
            isActive ? "text-sidebar-primary" : "text-sidebar-muted",
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {isRenaming ? (
            <Input
              ref={inputRef}
              value={draft}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingTabId(null);
              }}
              className="h-7 border-sidebar-border bg-sidebar px-2 text-sm"
            />
          ) : (
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {tab.name}
            </span>
          )}
          <span className="truncate px-0.5 text-xs text-sidebar-muted">
            {sessionSubtitle(tab)}
          </span>
        </div>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="pointer-events-none size-7 shrink-0 text-sidebar-muted opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 max-md:pointer-events-auto max-md:opacity-100 hover:text-sidebar-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={`Close ${tab.name}`}
      >
        <XIcon />
      </Button>
    </div>
  );
});
