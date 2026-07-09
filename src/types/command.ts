export type CommandRunStatus = "running" | "success" | "error";

export interface CommandRun {
  id: string;
  command: string;
  startedAt: number;
  status: CommandRunStatus;
  exitCode?: number;
}
