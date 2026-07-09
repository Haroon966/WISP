import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelShellProps {
  side: "left" | "right";
  title: string;
  collapsed?: boolean;
  onCollapse?: () => void;
  actions?: ReactNode;
  resizeHandle?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function PanelShell({
  side,
  title,
  collapsed,
  onCollapse,
  actions,
  resizeHandle,
  children,
  className,
  style,
}: PanelShellProps) {
  if (collapsed) return null;

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col bg-sidebar wisp-surface-inset",
        side === "left" ? "border-r border-sidebar-border" : "border-l border-sidebar-border",
        className,
      )}
      style={style}
    >
      {resizeHandle}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-sidebar-border px-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-sidebar-foreground">
          {title}
        </span>
        {actions}
        {onCollapse ? (
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={onCollapse}
            aria-label="Collapse panel"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </aside>
  );
}
