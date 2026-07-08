import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/useTabStore";

const ROW = "h-7";
const ARROW = "w-0 shrink-0 border-y-[14px] border-y-transparent";

interface PowerlinePromptProps {
  tabId: string;
  className?: string;
}

export function PowerlinePrompt({ tabId, className }: PowerlinePromptProps) {
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));
  const path = tab?.cwd ?? "~";

  return (
    <div className={cn("font-mono text-[13px] leading-none", className)}>
      <div className={cn("flex min-w-0 items-center", ROW)}>
        <div className="flex max-w-full min-w-0 items-center">
          <div
            className={cn(
              "flex min-w-0 items-center bg-[#5eb3f6] px-3 font-medium text-neutral-900",
              ROW,
            )}
          >
            <span className="truncate">{path}</span>
          </div>
          <div
            aria-hidden
            className={cn(ARROW, "border-l-[10px] border-l-[#5eb3f6]")}
          />
        </div>
      </div>
    </div>
  );
}
