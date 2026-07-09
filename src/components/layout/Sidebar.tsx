import { PanelLeftCloseIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabList } from "@/components/sidebar/TabList";
import { PlacesNav } from "@/components/sidebar/PlacesNav";
import {
  SIDEBAR_COLLAPSED_CLASS,
  SIDEBAR_WIDTH_CLASS,
  useSettingsStore,
} from "@/stores/useSettingsStore";
import { cn } from "@/lib/utils";

interface SidebarProps {
  compact?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenSettings?: () => void;
  onSessionSelect?: () => void;
  searchQuery?: string;
}

export function Sidebar({
  compact = false,
  open = false,
  onClose,
  onOpenSettings,
  onSessionSelect,
  searchQuery = "",
}: SidebarProps) {
  const sidebarWidth = useSettingsStore((s) => s.settings.sidebarWidth);
  const sidebarCollapsed = useSettingsStore((s) => s.settings.sidebarCollapsed);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const iconOnly = sidebarCollapsed && !compact;

  const toggleCollapsed = () => {
    updateSettings({ sidebarCollapsed: !sidebarCollapsed });
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out wisp-surface-inset",
        compact
          ? cn(
              "absolute inset-y-0 left-0 z-50 w-[min(85vw,18rem)] max-w-72 shadow-xl transition-transform duration-200 ease-out",
              open ? "translate-x-0" : "-translate-x-full pointer-events-none",
            )
          : iconOnly
            ? SIDEBAR_COLLAPSED_CLASS
            : SIDEBAR_WIDTH_CLASS[sidebarWidth],
      )}
      data-tauri-drag-region
      aria-hidden={compact && !open}
      aria-expanded={!iconOnly}
    >
      <div
        className={cn(
          "flex w-full gap-2 p-3 pt-2.5",
          iconOnly ? "flex-col items-center px-2" : "items-center",
        )}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {compact ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 cursor-pointer"
            onClick={() => onClose?.()}
            aria-label="Close sessions"
          >
            <PanelLeftCloseIcon />
          </Button>
        ) : null}
        <div className={cn("min-w-0", iconOnly ? "w-full" : "flex-1")}>
          <PlacesNav
            iconOnly={iconOnly}
            showCollapseToggle={!compact}
            onToggleCollapsed={toggleCollapsed}
          />
        </div>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          iconOnly ? "px-1" : "px-2",
        )}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <TabList
          query={searchQuery}
          iconOnly={iconOnly}
          onSessionSelect={onSessionSelect}
        />
      </div>
      <div
        className={cn(
          "border-t border-sidebar-border p-2",
          iconOnly && "flex flex-col items-center gap-1 px-1",
        )}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size={iconOnly ? "icon" : "default"}
          className={cn(
            "cursor-pointer transition-colors duration-200",
            iconOnly ? "size-9" : "w-full justify-start",
          )}
          onClick={() => onOpenSettings?.()}
          aria-label="Settings"
          title={iconOnly ? "Settings" : undefined}
        >
          <SettingsIcon data-icon={iconOnly ? undefined : "inline-start"} />
          {iconOnly ? null : "Settings"}
        </Button>
      </div>
    </aside>
  );
}
