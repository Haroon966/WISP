import { EyeIcon, FileCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConflictDialog } from "@/components/editor/ConflictDialog";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { MonacoEditor } from "@/components/editor/MonacoEditor";
import { useEditorStore } from "@/stores/useEditorStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { EditorFile } from "@/types/editor";

interface MarkdownEditorPaneProps {
  tabId: string;
  file: EditorFile;
}

export function MarkdownEditorPane({ tabId, file }: MarkdownEditorPaneProps) {
  const setMdViewMode = useEditorStore((s) => s.setMdViewMode);
  const updateContent = useEditorStore((s) => s.updateContent);
  const saveActiveFile = useEditorStore((s) => s.saveActiveFile);
  const editorAutosave = useSettingsStore((s) => s.settings.editorAutosave);

  const name = file.path.split("/").pop() ?? file.path;
  const isPreview = file.mdViewMode === "preview";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-3">
        <span className="truncate text-xs text-muted-foreground">
          {name}
          {file.dirty ? <span className="ml-1 text-foreground">•</span> : null}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 cursor-pointer px-2 text-xs"
          onClick={() =>
            setMdViewMode(tabId, file.id, isPreview ? "source" : "preview")
          }
        >
          {isPreview ? (
            <>
              <FileCodeIcon data-icon="inline-start" />
              Edit
            </>
          ) : (
            <>
              <EyeIcon data-icon="inline-start" />
              Preview
            </>
          )}
        </Button>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {isPreview ? (
          <MarkdownPreview file={file} />
        ) : (
          <MonacoEditor
            file={file}
            onChange={(content) => updateContent(tabId, file.id, content)}
            onBlur={() => {
              if (editorAutosave === "onFocusChange") {
                void saveActiveFile(tabId);
              }
            }}
          />
        )}
      </div>
      <ConflictDialog file={file} tabId={tabId} onResolved={() => {}} />
    </div>
  );
}
