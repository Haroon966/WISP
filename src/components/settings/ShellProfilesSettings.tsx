import { useState } from "react";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfileStore } from "@/stores/useProfileStore";
import type { ShellKind } from "@/types/profile";

const SHELL_OPTIONS: { value: ShellKind; label: string }[] = [
  { value: "auto", label: "Auto (Fish → Bash → Zsh)" },
  { value: "fish", label: "Fish" },
  { value: "bash", label: "Bash" },
  { value: "zsh", label: "Zsh" },
];

function EnvEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={"FOO=bar\nBAZ=qux"}
      className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
    />
  );
}

function parseEnv(text: string): Record<string, string> | undefined {
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return Object.keys(env).length > 0 ? env : undefined;
}

function formatEnv(env?: Record<string, string>): string {
  if (!env) return "";
  return Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

export function ShellProfilesSettings() {
  const profiles = useProfileStore((s) => s.profiles);
  const addProfile = useProfileStore((s) => s.addProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const removeProfile = useProfileStore((s) => s.removeProfile);
  const openProfile = useProfileStore((s) => s.openProfile);

  const [name, setName] = useState("");
  const [shell, setShell] = useState<ShellKind>("auto");
  const [cwd, setCwd] = useState("~");
  const [startupCommand, setStartupCommand] = useState("");
  const [envText, setEnvText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setShell("auto");
    setCwd("~");
    setStartupCommand("");
    setEnvText("");
    setEditingId(null);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      shell,
      cwd: cwd.trim() || "~",
      startupCommand: startupCommand.trim() || undefined,
      env: parseEnv(envText),
    };
    if (editingId) {
      updateProfile(editingId, payload);
    } else {
      addProfile(payload);
    }
    resetForm();
  };

  const startEdit = (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;
    setEditingId(id);
    setName(profile.name);
    setShell(profile.shell);
    setCwd(profile.cwd ?? "~");
    setStartupCommand(profile.startupCommand ?? "");
    setEnvText(formatEnv(profile.env));
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
          <Label className="text-sm font-medium">
            {editingId ? "Edit profile" : "Add profile"}
          </Label>
        </div>
        <div className="space-y-3 p-4">
          <div className="grid gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <Select value={shell} onValueChange={(v) => setShell(v as ShellKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHELL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={cwd} onChange={(e) => setCwd(e.target.value)} placeholder="Working directory" />
          <Input
            value={startupCommand}
            onChange={(e) => setStartupCommand(e.target.value)}
            placeholder="Startup command (optional)"
            className="font-mono text-sm"
          />
          <EnvEditor value={envText} onChange={setEnvText} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="cursor-pointer" onClick={handleSave} disabled={!name.trim()}>
            <PlusIcon data-icon="inline-start" />
            {editingId ? "Update profile" : "Add profile"}
          </Button>
          {editingId ? (
            <Button size="sm" variant="ghost" className="cursor-pointer" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
        </div>
      </section>

      {profiles.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm">
          <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
            <Label className="text-sm font-medium">Saved profiles</Label>
          </div>
          <div className="divide-y divide-border/50">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between gap-2 px-4 py-3 transition-colors duration-200 hover:bg-muted/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{profile.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile.shell} · {profile.cwd ?? "~"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => openProfile(profile.id)}
                  >
                    Open
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => startEdit(profile.id)}
                    aria-label={`Edit ${profile.name}`}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => removeProfile(profile.id)}
                    aria-label={`Remove ${profile.name}`}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="px-1 text-sm text-muted-foreground">
          Shell profiles set cwd, shell, env vars, and an optional startup command for new sessions.
        </p>
      )}
    </div>
  );
}
