export type TabStatus = "neutral" | "running" | "success";

export interface Tab {
  id: string;
  name: string;
  status: TabStatus;
  sessionId?: string;
  cwd?: string;
  branch?: string | null;
  commandHistory: string[];
}
