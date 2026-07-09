import { ChevronDownIcon, PanelLeftCloseIcon, PanelRightOpenIcon, PlusIcon } from "lucide-react";
import { PLACE_FOLDERS } from "@/lib/folders";
import { loadRecentDirs } from "@/lib/recentDirs";
import { getTabDisplayMeta } from "@/stores/useTabStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderMenuItem } from "@/components/sidebar/FolderMenuItem";
import { useTabStore } from "@/stores/useTabStore";
import { cn } from "@/lib/utils";

interface PlacesNavProps {
  iconOnly?: boolean;
  showCollapseToggle?: boolean;
  onToggleCollapsed?: () => void;
}

const pillGroup =
  "flex shrink-0 items-center gap-1 overflow-hidden rounded-md border border-sidebar-border/60 bg-sidebar-accent p-0.5 shadow-sm";

export function PlacesNav({
  iconOnly = false,
  showCollapseToggle = false,
  onToggleCollapsed,
}: PlacesNavProps) {
  const activeTab = useTabStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId),
  );
  const addTab = useTabStore((s) => s.addTab);
  const recentDirs = loadRecentDirs();

  const { cwd } = activeTab ? getTabDisplayMeta(activeTab) : { cwd: undefined };

  const openFolder = (_name: string, path: string) => {
    addTab(undefined, path);
  };

  const btnClass = iconOnly ? "h-9 min-w-0 flex-1 rounded-md" : "size-9 rounded-md";

  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        iconOnly ? "flex-col gap-1" : "flex-row items-center gap-2",
      )}
    >
      <div className={cn(pillGroup, iconOnly ? "w-full" : "min-w-0 flex-1")}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "cursor-pointer text-sidebar-foreground transition-colors duration-200 hover:bg-primary/15 hover:text-sidebar-primary",
            btnClass,
          )}
          onClick={() => addTab()}
          aria-label="New session"
          title={iconOnly ? "New session" : undefined}
        >
          <PlusIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "cursor-pointer rounded-md text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent/80",
                btnClass,
              )}
              aria-label="Open folder"
              title={iconOnly ? "Open folder" : undefined}
            >
              <ChevronDownIcon className="size-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {recentDirs.length > 0 ? (
              <>
                <DropdownMenuLabel>Recent</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {recentDirs.slice(0, 5).map((dir) => (
                    <DropdownMenuItem
                      key={dir}
                      className="cursor-pointer"
                      onClick={() => {
                        const name = dir.split("/").filter(Boolean).pop() ?? dir;
                        openFolder(name, dir);
                      }}
                    >
                      <span className="truncate">{dir}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuLabel>Places</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {PLACE_FOLDERS.map((place) => (
                <FolderMenuItem
                  key={place.path}
                  name={place.name}
                  path={place.path}
                  icon={place.icon}
                  activeCwd={cwd}
                  onOpen={openFolder}
                />
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showCollapseToggle ? (
        <div className={cn(pillGroup, iconOnly && "w-full")}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "cursor-pointer text-sidebar-muted transition-colors duration-200 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
              iconOnly ? "h-9 w-full rounded-md" : btnClass,
            )}
            onClick={onToggleCollapsed}
            aria-label={iconOnly ? "Expand sidebar" : "Collapse sidebar"}
            title={iconOnly ? "Expand sidebar" : "Collapse sidebar"}
          >
            {iconOnly ? (
              <PanelRightOpenIcon className="size-4" />
            ) : (
              <PanelLeftCloseIcon className="size-4" />
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
