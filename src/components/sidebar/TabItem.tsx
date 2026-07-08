import { GitBranchIcon, TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tab, TabStatus } from "@/types/tab";

const iconVariants = [
  "bg-sidebar-primary text-sidebar-primary-foreground",
  "bg-sidebar-accent text-sidebar-foreground ring-1 ring-sidebar-border",
] as const;

const statusBorder: Record<TabStatus, string> = {
  neutral: "border-transparent",
  running: "border-status-running",
  success: "border-status-success bg-status-success/15",
};

const statusLabels: Record<TabStatus, string> = {
  neutral: "Idle",
  running: "Running",
  success: "Done",
};

interface TabItemProps {
  tab: Tab;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

function sessionSubtitle(tab: Tab): string {
  return tab.branch ?? tab.cwd ?? "~";
}

export function TabItem({ tab, index, isActive, onSelect }: TabItemProps) {
  const iconStyle = iconVariants[index % iconVariants.length];

  return (
    <button
      type="button"
      onClick={onSelect}
      title={statusLabels[tab.status]}
      aria-label={`${tab.name}, ${statusLabels[tab.status]}`}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-2 py-2.5 text-left transition-colors duration-200",
        "hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        statusBorder[tab.status],
        isActive && tab.status === "neutral" && "bg-sidebar-accent",
      )}
    >
      <div className="shrink-0">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-full",
            iconStyle,
          )}
        >
          <TerminalIcon className="size-4" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-sidebar-foreground">
          {tab.name}
        </span>
        <span className="flex min-w-0 items-center gap-1 text-xs text-sidebar-muted">
          <GitBranchIcon className="size-3 shrink-0" />
          <span className="truncate">{sessionSubtitle(tab)}</span>
        </span>
      </div>
    </button>
  );
}
