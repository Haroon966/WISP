import { MegaphoneIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaneControlsProps {
  minimized: boolean;
  broadcast?: boolean;
  onToggleMinimize: () => void;
  onToggleBroadcast?: () => void;
  onClose: () => void;
  className?: string;
}

export function PaneControls({
  minimized,
  broadcast = false,
  onToggleMinimize,
  onToggleBroadcast,
  onClose,
  className,
}: PaneControlsProps) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {onToggleBroadcast ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-6",
            broadcast
              ? "text-primary hover:text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={onToggleBroadcast}
          aria-label={broadcast ? "Disable broadcast input" : "Broadcast input to all panes"}
          title={broadcast ? "Broadcast on" : "Broadcast to all panes"}
        >
          <MegaphoneIcon className="size-3" strokeWidth={1.5} />
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-muted-foreground hover:text-foreground"
        onClick={onToggleMinimize}
        aria-label={minimized ? "Restore pane" : "Minimize pane"}
      >
        {minimized ? (
          <SquareIcon className="size-3" strokeWidth={1.25} />
        ) : (
          <MinusIcon className="size-3" strokeWidth={1.25} />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-muted-foreground hover:text-destructive"
        onClick={onClose}
        aria-label="Close pane"
      >
        <XIcon className="size-3" strokeWidth={1.25} />
      </Button>
    </div>
  );
}
