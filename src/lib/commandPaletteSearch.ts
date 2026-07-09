import { useMemo } from "react";
import { PLACE_FOLDERS } from "@/lib/folders";
import { createFuse } from "@/lib/search";
import { LAYOUT_PRESETS, type LayoutPresetId } from "@/lib/layout-presets";
import { getTabDisplayMeta } from "@/stores/useTabStore";
import type { ProjectTask } from "@/lib/fs";
import type { Tab } from "@/types/tab";
import type { ShellProfile } from "@/types/profile";
import type { CommandSnippet } from "@/types/snippet";
import type { SshProfile } from "@/types/ssh";
import type { Workspace } from "@/types/workspace";

export function buildCommandPaletteSearchCatalog(input: {
  tabs: Tab[];
  projectTasks: ProjectTask[];
  globalHistory: string[];
  snippets: CommandSnippet[];
  shellProfiles: ShellProfile[];
  recentDirs: string[];
  workspaces: Workspace[];
  sshProfiles: SshProfile[];
  activeCwd: string;
}) {
  const entries: { value: string }[] = [];

  for (const tab of input.tabs) {
    const { cwd, branch } = getTabDisplayMeta(tab);
    entries.push({
      value: `session ${tab.name} ${cwd ?? "~"} ${branch ?? ""}`.trim(),
    });
  }

  for (const task of input.projectTasks) {
    entries.push({
      value: `task ${task.name} ${task.command} ${task.source}`,
    });
  }

  for (const cmd of input.globalHistory) {
    entries.push({ value: cmd });
  }

  for (const snippet of input.snippets) {
    entries.push({
      value: `snippet ${snippet.name} ${snippet.command}`,
    });
  }

  for (const profile of input.shellProfiles) {
    entries.push({
      value: `profile ${profile.name} ${profile.shell} ${profile.cwd ?? "~"}`,
    });
  }

  for (const place of PLACE_FOLDERS) {
    entries.push({ value: `place ${place.name} ${place.path}` });
  }

  for (const dir of input.recentDirs) {
    entries.push({ value: `recent ${dir}` });
  }

  for (const ws of input.workspaces) {
    entries.push({ value: `workspace ${ws.name}` });
    entries.push({ value: `delete workspace ${ws.name}` });
  }

  for (const profile of input.sshProfiles) {
    entries.push({
      value: `ssh ${profile.name} ${profile.host} ${profile.user ?? ""}`,
    });
  }

  entries.push({ value: "action new session" });
  for (const preset of Object.keys(LAYOUT_PRESETS) as LayoutPresetId[]) {
    entries.push({
      value: `layout preset ${LAYOUT_PRESETS[preset].label} ${LAYOUT_PRESETS[preset].description}`,
    });
  }
  entries.push(
    { value: "action split horizontal" },
    { value: "action split vertical" },
    { value: "action broadcast input enable disable" },
    { value: "action run last command all panes" },
    { value: "action reopen closed session" },
    { value: "action command history" },
    { value: "action save workspace" },
    { value: "action close session pane" },
    { value: "action settings" },
  );

  return entries;
}

export function useCommandPaletteFuse(input: Parameters<typeof buildCommandPaletteSearchCatalog>[0]) {
  return useMemo(() => {
    const catalog = buildCommandPaletteSearchCatalog(input);
    return createFuse(catalog, ["value"]);
  }, [
    input.tabs,
    input.projectTasks,
    input.globalHistory,
    input.snippets,
    input.shellProfiles,
    input.recentDirs,
    input.workspaces,
    input.sshProfiles,
    input.activeCwd,
  ]);
}
