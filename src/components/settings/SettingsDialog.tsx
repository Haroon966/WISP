import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FolderIcon,
  KeyboardIcon,
  PaletteIcon,
  ServerIcon,
  Settings2Icon,
  TerminalIcon,
  UserIcon,
  ZapIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { SshProfilesSettings } from "@/components/settings/SshProfilesSettings";
import { ShellProfilesSettings } from "@/components/settings/ShellProfilesSettings";
import { SnippetsSettings } from "@/components/settings/SnippetsSettings";
import type { Settings } from "@/types/settings";
import { COLOR_PALETTES, resolvePalette } from "@/lib/color-themes";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NAV_ITEMS = [
  { value: "appearance", label: "Appearance", icon: PaletteIcon },
  { value: "terminal", label: "Terminal", icon: TerminalIcon },
  { value: "sessions", label: "Sessions", icon: FolderIcon },
  { value: "profiles", label: "Profiles", icon: UserIcon },
  { value: "snippets", label: "Snippets", icon: ZapIcon },
  { value: "ssh", label: "SSH", icon: ServerIcon },
  { value: "shortcuts", label: "Shortcuts", icon: KeyboardIcon },
] as const;

type SettingsTab = (typeof NAV_ITEMS)[number]["value"];

function SettingSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm",
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="divide-y divide-border/50">{children}</div>
    </section>
  );
}

function SettingRow({
  id,
  label,
  description,
  children,
}: {
  id?: string;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-muted/20 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const SHORTCUTS = [
  { keys: "Ctrl+Shift+C", action: "Copy selection" },
  { keys: "Ctrl+Shift+V", action: "Paste" },
  { keys: "Shift+Insert", action: "Paste" },
  { keys: "Right click", action: "Paste (or copy if selected)" },
  { keys: "Middle click", action: "Paste" },
  { keys: "Ctrl+F", action: "Find in terminal" },
  { keys: "Ctrl+Shift+F", action: "Find in terminal (while typing)" },
  { keys: "Ctrl+Shift+P", action: "Command palette" },
  { keys: "Ctrl+K", action: "Command palette" },
  { keys: "Ctrl+T", action: "New session" },
  { keys: "Ctrl+W", action: "Close session / pane" },
  { keys: "Ctrl+\\", action: "Split horizontal" },
  { keys: "Ctrl+Shift+\\", action: "Split vertical" },
  { keys: "Ctrl+Tab", action: "Next session" },
  { keys: "Ctrl+Shift+Tab", action: "Previous session" },
  { keys: "Ctrl+1–9", action: "Jump to session" },
  { keys: "Ctrl+Shift+T", action: "Reopen closed session" },
  { keys: "Ctrl+Shift+H", action: "Command history" },
  { keys: "Ctrl+Alt+←/↑", action: "Previous pane" },
  { keys: "Ctrl+Alt+→/↓", action: "Next pane" },
  { keys: "Ctrl+,", action: "Open settings" },
  { keys: "F2", action: "Rename session" },
  { keys: "Ctrl+`", action: "Toggle Wisp (when global hotkey enabled)" },
];

interface ShellInfo {
  kind: string;
  path?: string | null;
  version?: string | null;
  bashPath?: string | null;
  zshPath?: string | null;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const resetSettings = useSettingsStore((s) => s.resetSettings);
  const [shellInfo, setShellInfo] = useState<ShellInfo | null>(null);
  const [resetAck, setResetAck] = useState(false);

  useEffect(() => {
    if (!open) return;
    void invoke<ShellInfo>("get_shell_info").then(setShellInfo).catch(() => {
      setShellInfo({ kind: "fallback" });
    });
  }, [open]);

  useEffect(() => {
    if (!resetAck) return;
    const timer = window.setTimeout(() => setResetAck(false), 2000);
    return () => window.clearTimeout(timer);
  }, [resetAck]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    updateSettings({ [key]: value });
  };

  const shellDescription =
    shellInfo?.kind === "fish" && shellInfo.path
      ? `${shellInfo.path}${shellInfo.version ? ` · ${shellInfo.version}` : ""}. New sessions use Fish unless a profile overrides.`
      : [
          shellInfo?.bashPath ? `Bash: ${shellInfo.bashPath}` : null,
          shellInfo?.zshPath ? `Zsh: ${shellInfo.zshPath}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Fish when available; Bash/Zsh hooks otherwise.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,720px)] max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/10 px-4 py-4 pr-12 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
              <Settings2Icon className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Customize appearance, terminal, and session behavior.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          defaultValue={"appearance" satisfies SettingsTab}
          orientation="vertical"
          className="flex min-h-0 flex-1 flex-col md:flex-row"
        >
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <aside className="flex shrink-0 flex-col border-b border-border/60 bg-muted/15 md:w-44 md:border-r md:border-b-0">
              <TabsList
                variant="line"
                className="h-auto w-full flex-row items-stretch gap-0.5 overflow-x-auto rounded-none bg-transparent p-2 md:flex-col md:overflow-x-visible"
              >
                {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="w-auto shrink-0 cursor-pointer justify-start gap-2.5 rounded-lg px-3 py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm md:w-full"
                  >
                    <Icon className="size-4 shrink-0 opacity-70" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </aside>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <TabsContent value="appearance" className="mt-0 space-y-4">
                <SettingSection title="Look & feel">
                  <SettingRow
                    id="settings-theme"
                    label="Theme"
                    description="Choose light, dark, or match your system."
                  >
                    <Select
                      value={settings.theme}
                      onValueChange={(v) => set("theme", v as Settings["theme"])}
                    >
                      <SelectTrigger id="settings-theme" className="w-36 cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow
                    id="settings-sidebar-width"
                    label="Sidebar width"
                    description="Adjust the session list panel width."
                  >
                    <Select
                      value={settings.sidebarWidth}
                      onValueChange={(v) =>
                        set("sidebarWidth", v as Settings["sidebarWidth"])
                      }
                    >
                      <SelectTrigger
                        id="settings-sidebar-width"
                        className="w-36 cursor-pointer"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="narrow">Narrow</SelectItem>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="wide">Wide</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow
                    id="settings-sidebar-search"
                    label="Session search"
                    description="Show the search field in the sidebar."
                  >
                    <Switch
                      id="settings-sidebar-search"
                      checked={settings.showSidebarSearch}
                      onCheckedChange={(v) => set("showSidebarSearch", v)}
                    />
                  </SettingRow>
                </SettingSection>

                <SettingSection
                  title="File explorer"
                  description="Right-side file tree and editor behavior."
                >
                  <SettingRow
                    id="settings-explorer-open"
                    label="Show explorer"
                    description="Display the file tree panel on the right."
                  >
                    <Switch
                      id="settings-explorer-open"
                      checked={settings.explorerOpen}
                      onCheckedChange={(v) => set("explorerOpen", v)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="settings-explorer-hidden"
                    label="Show hidden files"
                    description="Include dotfiles and dot-directories in the tree."
                  >
                    <Switch
                      id="settings-explorer-hidden"
                      checked={settings.explorerShowHidden}
                      onCheckedChange={(v) => set("explorerShowHidden", v)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="settings-editor-autosave"
                    label="Editor autosave"
                    description="Save files when the editor loses focus."
                  >
                    <Select
                      value={settings.editorAutosave}
                      onValueChange={(v) =>
                        set("editorAutosave", v as Settings["editorAutosave"])
                      }
                    >
                      <SelectTrigger id="settings-editor-autosave" className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="onFocusChange">On blur</SelectItem>
                        <SelectItem value="afterDelay">After delay</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </SettingSection>

                <SettingSection
                  title="Color palette"
                  description="Accent colors for highlights, buttons, and the terminal cursor."
                >
                  <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
                    {COLOR_PALETTES.map((palette) => {
                      const swatches =
                        palette.id === "custom"
                          ? ([
                              settings.customColors.accent,
                              resolvePalette("custom", settings.customColors)
                                .accentMuted,
                              settings.customColors.secondary,
                            ] as [string, string, string])
                          : palette.preview;
                      return (
                        <button
                          key={palette.id}
                          type="button"
                          onClick={() => set("colorPalette", palette.id)}
                          className={cn(
                            "cursor-pointer rounded-xl border p-3 text-left transition-colors duration-200",
                            settings.colorPalette === palette.id
                              ? "border-primary bg-primary/5 ring-2 ring-primary/25"
                              : "border-border/60 hover:border-border hover:bg-muted/30",
                          )}
                          aria-pressed={settings.colorPalette === palette.id}
                        >
                          <div className="mb-2 flex gap-1">
                            {swatches.map((color) => (
                              <span
                                key={color}
                                className="size-5 rounded-full border border-black/10 shadow-sm"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span className="block text-xs font-medium text-foreground">
                            {palette.name}
                          </span>
                          <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">
                            {palette.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {settings.colorPalette === "custom" ? (
                    <div className="flex flex-wrap items-end gap-6 border-t border-border/50 px-4 py-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="settings-custom-accent" className="text-xs">
                          Accent
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            id="settings-custom-accent"
                            type="color"
                            value={settings.customColors.accent}
                            onChange={(e) =>
                              updateSettings({
                                customColors: {
                                  ...settings.customColors,
                                  accent: e.target.value,
                                },
                              })
                            }
                            className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                          />
                          <span className="font-mono text-xs text-muted-foreground">
                            {settings.customColors.accent}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="settings-custom-secondary" className="text-xs">
                          Secondary
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            id="settings-custom-secondary"
                            type="color"
                            value={settings.customColors.secondary}
                            onChange={(e) =>
                              updateSettings({
                                customColors: {
                                  ...settings.customColors,
                                  secondary: e.target.value,
                                },
                              })
                            }
                            className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                          />
                          <span className="font-mono text-xs text-muted-foreground">
                            {settings.customColors.secondary}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </SettingSection>
              </TabsContent>

              <TabsContent value="terminal" className="mt-0 space-y-4">
                <SettingSection title="Display">
                  <SettingRow
                    id="settings-font-size"
                    label="Font size"
                    description={`${settings.terminalFontSize}px`}
                  >
                    <div className="flex w-40 items-center gap-3">
                      <Slider
                        id="settings-font-size"
                        min={12}
                        max={20}
                        step={1}
                        value={[settings.terminalFontSize]}
                        onValueChange={([v]) => set("terminalFontSize", v)}
                      />
                    </div>
                  </SettingRow>
                  <SettingRow
                    id="settings-font-family"
                    label="Font family"
                    description="Monospace font for the terminal."
                  >
                    <Select
                      value={settings.terminalFontFamily}
                      onValueChange={(v) =>
                        set("terminalFontFamily", v as Settings["terminalFontFamily"])
                      }
                    >
                      <SelectTrigger
                        id="settings-font-family"
                        className="w-40 cursor-pointer"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jetbrains">JetBrains Mono</SelectItem>
                        <SelectItem value="fira">Fira Code</SelectItem>
                        <SelectItem value="source">Source Code Pro</SelectItem>
                        <SelectItem value="system">System mono</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow
                    id="settings-cursor-blink"
                    label="Cursor blink"
                    description="Animate the terminal cursor."
                  >
                    <Switch
                      id="settings-cursor-blink"
                      checked={settings.terminalCursorBlink}
                      onCheckedChange={(v) => set("terminalCursorBlink", v)}
                    />
                  </SettingRow>
                </SettingSection>

                <SettingSection title="Shell & completions">
                  <SettingRow label="Default shell" description={shellDescription}>
                    <span className="max-w-36 truncate text-right text-sm text-muted-foreground">
                      {shellInfo?.kind === "fish" ? "Fish" : "System fallback"}
                    </span>
                  </SettingRow>
                  <SettingRow
                    id="settings-fish-autosuggest"
                    label="Fish autosuggestions"
                    description="Gray inline suggestions from fish history (native in terminal)."
                  >
                    <Switch
                      id="settings-fish-autosuggest"
                      checked={settings.fishAutosuggestions}
                      onCheckedChange={(v) => set("fishAutosuggestions", v)}
                    />
                  </SettingRow>
                </SettingSection>
              </TabsContent>

              <TabsContent value="sessions" className="mt-0 space-y-4">
                <SettingSection title="New sessions">
                  <SettingRow
                    id="settings-default-cwd"
                    label="Default folder"
                    description="Starting directory for new sessions."
                  >
                    <Input
                      id="settings-default-cwd"
                      value={settings.defaultCwd}
                      onChange={(e) => set("defaultCwd", e.target.value)}
                      className="w-44"
                      placeholder="~"
                    />
                  </SettingRow>
                  <SettingRow
                    id="settings-max-closed"
                    label="Closed session limit"
                    description={`Keep up to ${settings.maxClosedTabs} recently closed tabs.`}
                  >
                    <div className="flex w-40 items-center gap-3">
                      <Slider
                        id="settings-max-closed"
                        min={5}
                        max={50}
                        step={5}
                        value={[settings.maxClosedTabs]}
                        onValueChange={([v]) => set("maxClosedTabs", v)}
                      />
                    </div>
                  </SettingRow>
                </SettingSection>

                <SettingSection title="Behavior">
                  <SettingRow
                    id="settings-restore-session"
                    label="Restore sessions on launch"
                    description="Reopen your last tabs and layout when Wisp starts."
                  >
                    <Switch
                      id="settings-restore-session"
                      checked={settings.restoreSessionOnLaunch}
                      onCheckedChange={(v) => set("restoreSessionOnLaunch", v)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="settings-confirm-close"
                    label="Confirm before close"
                    description="Ask before closing a session tab."
                  >
                    <Switch
                      id="settings-confirm-close"
                      checked={settings.confirmCloseTab}
                      onCheckedChange={(v) => set("confirmCloseTab", v)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="settings-notify-complete"
                    label="Command completion alerts"
                    description="Notify when a background session finishes a command."
                  >
                    <Switch
                      id="settings-notify-complete"
                      checked={settings.notifyOnCommandComplete}
                      onCheckedChange={(v) => set("notifyOnCommandComplete", v)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="settings-global-hotkey"
                    label="Global hotkey"
                    description="Show or hide Wisp from anywhere (default Ctrl+`)."
                  >
                    <Switch
                      id="settings-global-hotkey"
                      checked={settings.globalHotkeyEnabled}
                      onCheckedChange={(v) => set("globalHotkeyEnabled", v)}
                    />
                  </SettingRow>
                </SettingSection>
              </TabsContent>

              <TabsContent value="profiles" className="mt-0">
                <ShellProfilesSettings />
              </TabsContent>

              <TabsContent value="snippets" className="mt-0">
                <SnippetsSettings />
              </TabsContent>

              <TabsContent value="ssh" className="mt-0">
                <SshProfilesSettings />
              </TabsContent>

              <TabsContent value="shortcuts" className="mt-0">
                <SettingSection
                  title="Keyboard shortcuts"
                  description="Quick reference for Wisp actions."
                >
                  {SHORTCUTS.map((shortcut) => (
                    <div
                      key={shortcut.keys}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 transition-colors duration-200 hover:bg-muted/20"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.action}
                      </span>
                      <kbd className="kbd shrink-0">{shortcut.keys}</kbd>
                    </div>
                  ))}
                </SettingSection>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <div className="flex shrink-0 items-center justify-between border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
          <p
            className={cn(
              "text-xs text-muted-foreground transition-opacity duration-200",
              resetAck ? "opacity-100" : "opacity-0",
            )}
            role="status"
            aria-live="polite"
          >
            Defaults restored
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              resetSettings();
              setResetAck(true);
            }}
          >
            Reset to defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
