import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClockIcon,
  FolderIcon,
  HistoryIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  MegaphoneIcon,
  PanelRightCloseIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  ServerIcon,
  SettingsIcon,
  SplitSquareHorizontalIcon,
  SplitSquareVerticalIcon,
  TerminalIcon,
  TrashIcon,
  UserIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLACE_FOLDERS } from "@/lib/folders";
import { loadRecentDirs } from "@/lib/recentDirs";
import { getFocusedPane } from "@/lib/layout";
import { discoverProjectTasks, type ProjectTask } from "@/lib/fs";
import { LAYOUT_PRESETS, type LayoutPresetId } from "@/lib/layout-presets";
import { createCmdkFuseFilter } from "@/lib/search";
import { useCommandPaletteFuse } from "@/lib/commandPaletteSearch";
import { getTabDisplayMeta, getGlobalCommandHistory, useTabStore } from "@/stores/useTabStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useSshStore } from "@/stores/useSshStore";
import { useSnippetStore } from "@/stores/useSnippetStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useEditorStore } from "@/stores/useEditorStore";
import type { TabStatus } from "@/types/tab";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onRunCommand?: (command: string) => void;
  onInsertCommand?: (command: string) => void;
  onBroadcastRun?: (command: string) => void;
}

const statusDotClass: Record<TabStatus, string> = {
  neutral: "status-dot--neutral",
  running: "status-dot--running",
  success: "status-dot--success",
  failed: "status-dot--failed",
};

function confirmClose(tabName: string): boolean {
  const { confirmCloseTab } = useSettingsStore.getState().settings;
  if (!confirmCloseTab) return true;
  return window.confirm(`Close "${tabName}"?`);
}

export function CommandPalette({
  open,
  onOpenChange,
  onOpenSettings,
  onOpenHistory,
  onRunCommand,
  onInsertCommand,
  onBroadcastRun,
}: CommandPaletteProps) {
  const shiftHeld = useRef(false);
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const removeTab = useTabStore((s) => s.removeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const reopenLastClosedTab = useTabStore((s) => s.reopenLastClosedTab);
  const splitPane = useTabStore((s) => s.splitPane);
  const closePane = useTabStore((s) => s.closePane);
  const addTabWithLayoutPreset = useTabStore((s) => s.addTabWithLayoutPreset);
  const toggleBroadcast = useTabStore((s) => s.toggleBroadcast);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const saveWorkspace = useWorkspaceStore((s) => s.saveWorkspace);
  const restoreWorkspace = useWorkspaceStore((s) => s.restoreWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const sshProfiles = useSshStore((s) => s.profiles);
  const connectSsh = useSshStore((s) => s.connect);
  const snippets = useSnippetStore((s) => s.snippets);
  const shellProfiles = useProfileStore((s) => s.profiles);
  const openShellProfile = useProfileStore((s) => s.openProfile);

  const [saveOpen, setSaveOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);

  const recentDirs = loadRecentDirs();
  const globalHistory = getGlobalCommandHistory(tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeCwd = activeTab ? getFocusedPane(activeTab).cwd ?? "~" : "~";

  const commandFuse = useCommandPaletteFuse({
    tabs,
    projectTasks,
    globalHistory,
    snippets,
    shellProfiles,
    recentDirs,
    workspaces,
    sshProfiles,
    activeCwd,
  });

  const commandFilter = useMemo(
    () => createCmdkFuseFilter(commandFuse),
    [commandFuse],
  );

  useEffect(() => {
    if (!open) return;
    void discoverProjectTasks(activeCwd)
      .then(setProjectTasks)
      .catch(() => setProjectTasks([]));
  }, [open, activeCwd]);

  const run = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  const handleSaveWorkspace = () => {
    const name = workspaceName.trim() || "Untitled";
    saveWorkspace(name);
    setWorkspaceName("");
    setSaveOpen(false);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    const trackShift = (e: KeyboardEvent) => {
      shiftHeld.current = e.shiftKey;
    };
    window.addEventListener("keydown", trackShift);
    window.addEventListener("keyup", trackShift);
    return () => {
      window.removeEventListener("keydown", trackShift);
      window.removeEventListener("keyup", trackShift);
      shiftHeld.current = false;
    };
  }, [open]);

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        commandFilter={commandFilter}
      >
        <CommandInput placeholder="Search sessions, commands, places..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {tabs.length > 0 ? (
            <CommandGroup heading="Sessions">
              {tabs.map((tab) => {
                const { cwd, branch, status } = getTabDisplayMeta(tab);
                return (
                  <CommandItem
                    key={tab.id}
                    value={`session ${tab.name} ${cwd ?? "~"} ${branch ?? ""}`.trim()}
                    onSelect={() => run(() => setActiveTab(tab.id))}
                    className="cursor-pointer"
                  >
                    <TerminalIcon />
                    <span className="truncate">{tab.name}</span>
                    <span className="ml-auto flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <span
                        className={cn("status-dot", statusDotClass[status])}
                        aria-hidden
                      />
                      <span className="truncate">
                        {[cwd ?? "~", branch].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null}

          {projectTasks.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Project tasks">
                {projectTasks.map((task) => (
                  <CommandItem
                    key={`${task.source}-${task.name}`}
                    value={`task ${task.name} ${task.command}`}
                    onSelect={() => run(() => onRunCommand?.(task.command))}
                  >
                    <TerminalIcon />
                    <span className="truncate font-mono text-xs">{task.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {task.source}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {globalHistory.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Command history">
                {globalHistory.slice(0, 15).map((cmd) => (
                  <CommandItem
                    key={cmd}
                    value={cmd}
                    onSelect={() =>
                      run(() =>
                        shiftHeld.current
                          ? onInsertCommand?.(cmd)
                          : onRunCommand?.(cmd),
                      )
                    }
                  >
                    <HistoryIcon />
                    <span className="truncate font-mono text-xs">{cmd}</span>
                    <CommandShortcut>↵ run · ⇧↵ insert</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {snippets.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Snippets">
                {snippets.map((snippet) => (
                  <CommandItem
                    key={snippet.id}
                    value={`snippet ${snippet.name} ${snippet.command}`}
                    onSelect={() =>
                      run(() =>
                        shiftHeld.current
                          ? onInsertCommand?.(snippet.command)
                          : onRunCommand?.(snippet.command),
                      )
                    }
                  >
                    <ZapIcon />
                    <span>{snippet.name}</span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {snippet.command}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {shellProfiles.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Shell profiles">
                {shellProfiles.map((profile) => (
                  <CommandItem
                    key={profile.id}
                    value={`profile ${profile.name} ${profile.shell} ${profile.cwd}`}
                    onSelect={() => run(() => openShellProfile(profile.id))}
                  >
                    <UserIcon />
                    <span>{profile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {profile.shell} · {profile.cwd ?? "~"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          <CommandSeparator />
          <CommandGroup heading="Places">
            {PLACE_FOLDERS.map((place) => (
              <CommandItem
                key={place.path}
                value={`place ${place.name} ${place.path}`}
                onSelect={() => run(() => addTab(place.name, place.path))}
              >
                <place.icon />
                <span>{place.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {recentDirs.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recent">
                {recentDirs.map((dir) => (
                  <CommandItem
                    key={dir}
                    value={`recent ${dir}`}
                    onSelect={() => {
                      const name = dir.split("/").filter(Boolean).pop() ?? dir;
                      run(() => addTab(name, dir));
                    }}
                  >
                    <ClockIcon />
                    <span className="truncate">{dir}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {workspaces.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Workspaces">
                {workspaces.map((ws) => (
                  <CommandItem
                    key={ws.id}
                    value={`workspace ${ws.name}`}
                    onSelect={() => run(() => restoreWorkspace(ws.id))}
                  >
                    <LayoutGridIcon />
                    <span>{ws.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ws.tabs.length} sessions
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {sshProfiles.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="SSH">
                {sshProfiles.map((profile) => (
                  <CommandItem
                    key={profile.id}
                    value={`ssh ${profile.name} ${profile.host}`}
                    onSelect={() => run(() => connectSsh(profile.id))}
                  >
                    <ServerIcon />
                    <span>{profile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {profile.user ? `${profile.user}@` : ""}
                      {profile.host}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem
              value="action new session"
              onSelect={() => run(() => addTab())}
            >
              <PlusIcon />
              <span>New session</span>
              <CommandShortcut>Ctrl+T</CommandShortcut>
            </CommandItem>
            {(Object.keys(LAYOUT_PRESETS) as LayoutPresetId[]).map((preset) => (
              <CommandItem
                key={preset}
                value={`layout preset ${LAYOUT_PRESETS[preset].label} ${LAYOUT_PRESETS[preset].description}`}
                onSelect={() =>
                  run(() => addTabWithLayoutPreset(preset, activeCwd))
                }
              >
                <LayoutTemplateIcon />
                <span>{LAYOUT_PRESETS[preset].label} layout</span>
                <span className="text-xs text-muted-foreground">
                  {LAYOUT_PRESETS[preset].description}
                </span>
              </CommandItem>
            ))}
            <CommandItem
              value="action split horizontal"
              onSelect={() => {
                if (!activeTabId) return;
                run(() => splitPane(activeTabId, "horizontal"));
              }}
            >
              <SplitSquareHorizontalIcon />
              <span>Split horizontal</span>
              <CommandShortcut>Ctrl+\</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="action split vertical"
              onSelect={() => {
                if (!activeTabId) return;
                run(() => splitPane(activeTabId, "vertical"));
              }}
            >
              <SplitSquareVerticalIcon />
              <span>Split vertical</span>
              <CommandShortcut>Ctrl+Shift+\</CommandShortcut>
            </CommandItem>
            {activeTab && Object.keys(activeTab.panes).length > 1 ? (
              <>
                <CommandItem
                  value="action broadcast input enable disable"
                  onSelect={() => {
                    if (!activeTabId) return;
                    run(() => toggleBroadcast(activeTabId));
                  }}
                >
                  <MegaphoneIcon />
                  <span>
                    {activeTab.broadcast ? "Disable" : "Enable"} broadcast input
                  </span>
                </CommandItem>
                {onBroadcastRun &&
                getFocusedPane(activeTab).commandHistory.length > 0 ? (
                  <CommandItem
                    value="action run last command all panes"
                    onSelect={() => {
                      const history = getFocusedPane(activeTab).commandHistory;
                      const last = history[history.length - 1];
                      if (last) run(() => onBroadcastRun(last));
                    }}
                  >
                    <MegaphoneIcon />
                    <span>Run last command in all panes</span>
                  </CommandItem>
                ) : null}
              </>
            ) : null}
            <CommandItem
              value="action reopen closed session"
              onSelect={() => run(() => reopenLastClosedTab())}
            >
              <RotateCcwIcon />
              <span>Reopen closed session</span>
              <CommandShortcut>Ctrl+Shift+T</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="action command history"
              onSelect={() => run(() => onOpenHistory())}
            >
              <HistoryIcon />
              <span>Command history</span>
              <CommandShortcut>Ctrl+Shift+H</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="action save workspace"
              onSelect={() => {
                setWorkspaceName("");
                setSaveOpen(true);
              }}
            >
              <FolderIcon />
              <span>Save workspace</span>
            </CommandItem>
            {activeTab ? (
              <CommandItem
                value="action close session pane"
                onSelect={() => {
                  const tab = activeTab;
                  const pane = getFocusedPane(tab);
                  const paneCount = Object.keys(tab.panes).length;
                  run(() => {
                    if (paneCount > 1) {
                      closePane(tab.id, pane.id);
                    } else if (confirmClose(tab.name)) {
                      removeTab(tab.id);
                    }
                  });
                }}
              >
                <XIcon />
                <span>Close session / pane</span>
                <CommandShortcut>Ctrl+W</CommandShortcut>
              </CommandItem>
            ) : null}
            <CommandItem
              value="action save file"
              onSelect={() =>
                run(() => {
                  if (!activeTabId) return;
                  void useEditorStore.getState().saveActiveFile(activeTabId);
                })
              }
            >
              <SaveIcon />
              <span>File: Save</span>
              <CommandShortcut>Ctrl+S</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="action toggle explorer"
              onSelect={() =>
                run(() => {
                  const { explorerOpen } = useSettingsStore.getState().settings;
                  useSettingsStore
                    .getState()
                    .updateSettings({ explorerOpen: !explorerOpen });
                })
              }
            >
              <PanelRightCloseIcon />
              <span>View: Toggle Explorer</span>
              <CommandShortcut>Ctrl+Shift+E</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="action settings"
              onSelect={() => run(() => onOpenSettings())}
            >
              <SettingsIcon />
              <span>Settings</span>
              <CommandShortcut>Ctrl+,</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          {workspaces.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Manage workspaces">
                {workspaces.map((ws) => (
                  <CommandItem
                    key={`del-${ws.id}`}
                    value={`delete workspace ${ws.name}`}
                    onSelect={() => run(() => deleteWorkspace(ws.id))}
                  >
                    <TrashIcon />
                    <span>Delete workspace: {ws.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save workspace</DialogTitle>
          </DialogHeader>
          <Input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Workspace name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveWorkspace();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWorkspace}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
