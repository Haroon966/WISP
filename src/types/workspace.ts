import type { LayoutNode } from "@/types/layout";
import type { PersistedTabEditor } from "@/types/editor";

export interface WorkspacePaneSnapshot {
  cwd: string;
  sshHost?: string;
  initialCommand?: string;
  minimized?: boolean;
}

export interface WorkspaceTab {
  name: string;
  layout?: LayoutNode;
  panes?: Record<string, WorkspacePaneSnapshot>;
  focusedPaneId?: string;
  /** @deprecated legacy single-pane snapshot */
  cwd?: string;
  editor?: PersistedTabEditor;
}

export interface Workspace {
  id: string;
  name: string;
  tabs: WorkspaceTab[];
}
