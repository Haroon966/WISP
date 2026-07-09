import type { CommandRun } from "@/types/command";
import type { LayoutNode } from "@/types/layout";

export type TabStatus = "neutral" | "running" | "success" | "failed";

import type { ShellKind } from "@/types/profile";

export interface PaneState {
  id: string;
  sessionId?: string;
  cwd?: string;
  branch?: string | null;
  status: TabStatus;
  commandHistory: string[];
  commandRuns: CommandRun[];
  initialCommand?: string;
  sshHost?: string;
  shell?: ShellKind;
  env?: Record<string, string>;
  minimized?: boolean;
}

export interface Tab {
  id: string;
  name: string;
  layout: LayoutNode;
  panes: Record<string, PaneState>;
  focusedPaneId: string;
  broadcast?: boolean;
}

export interface TabOpenOptions {
  initialCommand?: string;
  sshHost?: string;
  shell?: ShellKind;
  env?: Record<string, string>;
}
