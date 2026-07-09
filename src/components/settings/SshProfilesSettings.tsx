import { useState } from "react";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSshStore } from "@/stores/useSshStore";
import type { SshProfile } from "@/types/ssh";

const emptyForm = {
  name: "",
  host: "",
  user: "",
  port: "",
  identityFile: "",
  jumpHost: "",
};

export function SshProfilesSettings() {
  const profiles = useSshStore((s) => s.profiles);
  const addProfile = useSshStore((s) => s.addProfile);
  const updateProfile = useSshStore((s) => s.updateProfile);
  const removeProfile = useSshStore((s) => s.removeProfile);
  const connect = useSshStore((s) => s.connect);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const profileFromForm = (): Omit<SshProfile, "id"> => ({
    name: form.name.trim(),
    host: form.host.trim(),
    user: form.user.trim() || undefined,
    port: form.port ? Number(form.port) : undefined,
    identityFile: form.identityFile.trim() || undefined,
    jumpHost: form.jumpHost.trim() || undefined,
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.host.trim()) return;
    const payload = profileFromForm();
    if (editingId) {
      updateProfile(editingId, payload);
    } else {
      addProfile(payload);
    }
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (profile: SshProfile) => {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      host: profile.host,
      user: profile.user ?? "",
      port: profile.port ? String(profile.port) : "",
      identityFile: profile.identityFile ?? "",
      jumpHost: profile.jumpHost ?? "",
    });
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
          <Label className="text-sm font-medium">
            {editingId ? "Edit connection" : "Add connection"}
          </Label>
        </div>
        <div className="space-y-3 p-4">
          <div className="grid gap-2">
          <Input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Name (e.g. Production)"
          />
          <Input
            value={form.host}
            onChange={(e) => setField("host", e.target.value)}
            placeholder="Host"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={form.user}
              onChange={(e) => setField("user", e.target.value)}
              placeholder="User (optional)"
            />
            <Input
              value={form.port}
              onChange={(e) => setField("port", e.target.value)}
              placeholder="Port (optional)"
              type="number"
            />
          </div>
          <Input
            value={form.identityFile}
            onChange={(e) => setField("identityFile", e.target.value)}
            placeholder="Identity file path (optional)"
          />
          <Input
            value={form.jumpHost}
            onChange={(e) => setField("jumpHost", e.target.value)}
            placeholder="Jump host (optional, -J)"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={handleSave}
            disabled={!form.name.trim() || !form.host.trim()}
          >
            <PlusIcon data-icon="inline-start" />
            {editingId ? "Update profile" : "Add profile"}
          </Button>
          {editingId ? (
            <Button
              size="sm"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
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
                    {profile.jumpHost ? `${profile.jumpHost} → ` : ""}
                    {profile.user ? `${profile.user}@` : ""}
                    {profile.host}
                    {profile.port && profile.port !== 22 ? `:${profile.port}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => connect(profile.id)}
                  >
                    Connect
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => startEdit(profile)}
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
          No SSH profiles yet. Add one above or use the command palette.
        </p>
      )}
    </div>
  );
}
