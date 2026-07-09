import { MinusIcon, SquareIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tauriWindow } from "@/lib/tauriWindow";
import { cn } from "@/lib/utils";

interface WindowControlsProps {
  isMaximized: boolean;
  className?: string;
}

function RestoreIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block size-3.5", className)}>
      <SquareIcon
        className="absolute bottom-0 left-0 size-2.5"
        strokeWidth={1.25}
      />
      <SquareIcon
        className="absolute top-0 right-0 size-2.5"
        strokeWidth={1.25}
      />
    </span>
  );
}

export function WindowControls({ isMaximized, className }: WindowControlsProps) {
  const run = (action: (win: NonNullable<ReturnType<typeof tauriWindow>>) => void) => {
    const win = tauriWindow();
    if (win) action(win);
  };

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-7 cursor-pointer rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted/80 hover:text-foreground"
        onClick={() => run((win) => void win.minimize())}
        aria-label="Minimize"
      >
        <MinusIcon className="size-3.5" strokeWidth={1.25} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 cursor-pointer rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted/80 hover:text-foreground"
        onClick={() => run((win) => void win.toggleMaximize())}
        aria-label={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          <RestoreIcon />
        ) : (
          <SquareIcon className="size-3.5" strokeWidth={1.25} />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 cursor-pointer rounded-md text-muted-foreground transition-colors duration-200 hover:bg-destructive/15 hover:text-destructive"
        onClick={() => run((win) => void win.close())}
        aria-label="Close"
      >
        <XIcon className="size-3.5" strokeWidth={1.25} />
      </Button>
    </div>
  );
}
