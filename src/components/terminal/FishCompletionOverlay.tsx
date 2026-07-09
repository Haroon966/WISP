import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FishCompletionOverlayProps {
  prefix: string;
  candidates: string[];
  selectedIndex: number;
  open: boolean;
  onSelect: (index: number) => void;
}

export function FishCompletionOverlay({
  prefix,
  candidates,
  selectedIndex,
  open,
  onSelect,
}: FishCompletionOverlayProps) {
  if (!open || candidates.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-0 z-10 -translate-y-full pb-1">
      <div className="overflow-hidden rounded-md border border-border bg-popover shadow-md">
        <ScrollArea className="max-h-48">
          <ul className="py-1" role="listbox" aria-label="Fish completions">
            {candidates.map((candidate, index) => (
              <li key={`${index}-${candidate}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 text-left font-mono text-xs",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-muted/60",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(index);
                  }}
                >
                  {prefix && candidate.startsWith(prefix) ? (
                    <>
                      <span className="text-muted-foreground">{prefix}</span>
                      <span>{candidate.slice(prefix.length)}</span>
                    </>
                  ) : (
                    candidate
                  )}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="border-t px-2 py-1 text-[10px] text-muted-foreground">
          ↑↓ navigate · Tab/Enter accept · Esc dismiss
        </div>
      </div>
    </div>
  );
}
