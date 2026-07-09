import { memo } from "react";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  PlayIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTabStore } from "@/stores/useTabStore";
import type { CommandRunStatus } from "@/types/command";
import { cn } from "@/lib/utils";

const statusIcon: Record<CommandRunStatus, typeof PlayIcon> = {
  running: CircleDashedIcon,
  success: CheckCircle2Icon,
  error: XCircleIcon,
};

const statusClass: Record<CommandRunStatus, string> = {
  running: "text-status-running",
  success: "text-status-success",
  error: "text-destructive",
};

interface CommandBlocksProps {
  tabId: string;
  paneId: string;
  onRerun: (command: string) => void;
  className?: string;
}

const EMPTY_COMMAND_RUNS: never[] = [];

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const CommandBlocks = memo(function CommandBlocks({
  tabId,
  paneId,
  onRerun,
  className,
}: CommandBlocksProps) {
  const runs = useTabStore(
    (s) =>
      s.tabs.find((t) => t.id === tabId)?.panes[paneId]?.commandRuns ??
      EMPTY_COMMAND_RUNS,
  );

  const recent = runs.slice(-4).reverse();
  if (recent.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {recent.map((run) => {
        const Icon = statusIcon[run.status];
        return (
          <div
            key={run.id}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1"
          >
            <Icon className={cn("size-3.5 shrink-0", statusClass[run.status])} />
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {formatTime(run.startedAt)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs">
              {run.command}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              onClick={() => onRerun(run.command)}
              aria-label={`Re-run ${run.command}`}
            >
              <PlayIcon className="size-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
});
