import type React from "react";
import { useCommandHistory } from "@/hooks/useCommandHistory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGlobalCommandHistory, useTabStore } from "@/stores/useTabStore";

interface CommandHistoryDropdownProps {
  tabId?: string;
  paneId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  onRerun?: (command: string) => void;
  onInsert?: (command: string) => void;
}

export function CommandHistoryDropdown({
  tabId,
  paneId,
  open,
  onOpenChange,
  trigger,
  onRerun,
  onInsert,
}: CommandHistoryDropdownProps) {
  const { history: paneHistory } = useCommandHistory(tabId, paneId);
  const tabs = useTabStore((s) => s.tabs);
  const closedTabs = useTabStore((s) => s.closedTabs);
  const reopenClosedTab = useTabStore((s) => s.reopenClosedTab);
  const history = tabId && paneId ? paneHistory : getGlobalCommandHistory(tabs);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <Tabs defaultValue="commands" className="gap-0">
          <div className="border-b px-2 pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="commands" className="flex-1">
                Commands
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex-1">
                Sessions
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="commands" className="m-0">
            {history.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No commands yet
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <DropdownMenuGroup className="p-1">
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
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Click to re-run · Shift+click to insert
            </div>
          </TabsContent>
          <TabsContent value="sessions" className="m-0">
            {closedTabs.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No closed sessions
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <DropdownMenuGroup className="p-1">
                  {closedTabs.map((tab) => (
                    <DropdownMenuItem
                      key={tab.id}
                      className="cursor-pointer"
                      onClick={() => {
                        reopenClosedTab(tab.id);
                        onOpenChange(false);
                      }}
                    >
                      <span className="truncate">{tab.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </ScrollArea>
            )}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Reopen last · <kbd className="kbd">Ctrl+Shift+T</kbd>
            </div>
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
