export type ShellKind = "auto" | "fish" | "bash" | "zsh";

export interface ShellProfile {
  id: string;
  name: string;
  shell: ShellKind;
  cwd?: string;
  env?: Record<string, string>;
  startupCommand?: string;
}
