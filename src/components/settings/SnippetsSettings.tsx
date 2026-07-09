import { useState } from "react";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSnippetStore } from "@/stores/useSnippetStore";

export function SnippetsSettings() {
  const snippets = useSnippetStore((s) => s.snippets);
  const addSnippet = useSnippetStore((s) => s.addSnippet);
  const updateSnippet = useSnippetStore((s) => s.updateSnippet);
  const removeSnippet = useSnippetStore((s) => s.removeSnippet);

  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCommand, setEditCommand] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !command.trim()) return;
    addSnippet({ name: name.trim(), command: command.trim() });
    setName("");
    setCommand("");
  };

  const startEdit = (id: string) => {
    const snippet = snippets.find((s) => s.id === id);
    if (!snippet) return;
    setEditingId(id);
    setEditName(snippet.name);
    setEditCommand(snippet.command);
  };

  const commitEdit = () => {
    if (!editingId || !editName.trim() || !editCommand.trim()) return;
    updateSnippet(editingId, {
      name: editName.trim(),
      command: editCommand.trim(),
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
          <Label className="text-sm font-medium">Add snippet</Label>
        </div>
        <div className="space-y-3 p-4">
          <div className="grid gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. Deploy)"
          />
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Command"
            className="font-mono text-sm"
          />
        </div>
        <Button
          size="sm"
          className="cursor-pointer"
          onClick={handleAdd}
          disabled={!name.trim() || !command.trim()}
        >
          <PlusIcon data-icon="inline-start" />
          Add snippet
        </Button>
        </div>
      </section>

      {snippets.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm">
          <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
            <Label className="text-sm font-medium">Saved snippets</Label>
          </div>
          <div className="divide-y divide-border/50">
            {snippets.map((snippet) => (
              <div key={snippet.id} className="px-4 py-3 transition-colors duration-200 hover:bg-muted/20">
                {editingId === snippet.id ? (
                  <div className="space-y-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <Input
                      value={editCommand}
                      onChange={(e) => setEditCommand(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="cursor-pointer" onClick={commitEdit}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{snippet.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {snippet.command}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => startEdit(snippet.id)}
                        aria-label={`Edit ${snippet.name}`}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => removeSnippet(snippet.id)}
                        aria-label={`Remove ${snippet.name}`}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="px-1 text-sm text-muted-foreground">
          No snippets yet. Add commands you run often for quick access in the palette.
        </p>
      )}
    </div>
  );
}
