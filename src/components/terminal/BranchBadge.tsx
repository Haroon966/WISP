import { GitBranchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/useTabStore";

interface BranchBadgeProps {
  tabId: string;
  className?: string;
}

export function BranchBadge({ tabId, className }: BranchBadgeProps) {
  const branch = useTabStore((s) => s.tabs.find((t) => t.id === tabId)?.branch);
  if (!branch) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-3 bottom-2 flex max-w-[45%] items-center gap-1 font-mono text-[11px] text-muted-foreground/70",
        className,
      )}
    >
      <GitBranchIcon className="size-3 shrink-0 opacity-60" />
      <span className="truncate">{branch}</span>
    </div>
  );
}
