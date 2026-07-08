import { useCommandHistory } from "@/hooks/useCommandHistory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommandHistoryDropdownProps {
  tabId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  onRerun?: (command: string) => void;
  onInsert?: (command: string) => void;
}

export function CommandHistoryDropdown({
  tabId,
  open,
  onOpenChange,
  trigger,
  onRerun,
  onInsert,
}: CommandHistoryDropdownProps) {
  const { history } = useCommandHistory(tabId);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Command History</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {history.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No commands yet
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            <DropdownMenuGroup>
              {history.map((cmd, i) => (
                <DropdownMenuItem
                  key={`${i}-${cmd}`}
                  className="cursor-pointer font-mono text-xs"
                  onClick={(e) => {
                    if (e.shiftKey) {
                      onInsert?.(cmd);
                    } else {
                      onRerun?.(cmd);
                    }
                    onOpenChange(false);
                  }}
                >
                  <span className="truncate">{cmd}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </ScrollArea>
        )}
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-xs text-muted-foreground">
          Click to re-run · Shift+click to insert
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import type React from "react";
