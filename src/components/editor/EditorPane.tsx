import { openPath } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConflictDialog } from "@/components/editor/ConflictDialog";
import { MediaPreview } from "@/components/editor/MediaPreview";
import { MarkdownEditorPane } from "@/components/editor/MarkdownEditorPane";
import { MonacoEditor } from "@/components/editor/MonacoEditor";
import { useEditorStore } from "@/stores/useEditorStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { canPreviewMedia, isMediaPath } from "@/lib/media";
import { isMarkdownPath } from "@/lib/markdown";
import type { EditorFile } from "@/types/editor";

function BinaryFileView({ file }: { file: EditorFile }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      <p>
        {file.encoding === "too_large" ? "File is too large" : "Binary file"} —{" "}
        {file.path.split("/").pop()}
      </p>
      <Button
        variant="outline"
        className="cursor-pointer"
        onClick={() => void openPath(file.path)}
      >
        <ExternalLinkIcon data-icon="inline-start" />
        Open in default app
      </Button>
    </div>
  );
}

function LargeFilePrompt({
  file,
  tabId,
}: {
  file: EditorFile;
  tabId: string;
}) {
  const openFile = useEditorStore((s) => s.openFile);
  const isMedia = isMediaPath(file.path);
  const canPreview = canPreviewMedia(file.path, file.size);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      <p>
        {file.path.split("/").pop()} is large ({formatBytes(file.size)}).
      </p>
      <div className="flex gap-2">
        {isMedia && canPreview ? (
          <Button
            className="cursor-pointer"
            onClick={() =>
              void openFile(tabId, file.path, { forceLarge: true, pin: true })
            }
          >
            Preview anyway
          </Button>
        ) : (
          <Button
            className="cursor-pointer"
            onClick={() =>
              void openFile(tabId, file.path, { forceLarge: true, pin: true })
            }
          >
            Open anyway
          </Button>
        )}
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={() => void openPath(file.path)}
        >
          Open externally
        </Button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface EditorPaneProps {
  tabId: string;
  file: EditorFile | null;
}

export function EditorPane({ tabId, file }: EditorPaneProps) {
  const updateContent = useEditorStore((s) => s.updateContent);
  const saveActiveFile = useEditorStore((s) => s.saveActiveFile);
  const editorAutosave = useSettingsStore((s) => s.settings.editorAutosave);

  if (!file) return null;

  if (file.encoding === "image" || file.encoding === "video") {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MediaPreview file={file} />
      </div>
    );
  }

  if (file.encoding === "binary" || file.encoding === "too_large") {
    if (file.encoding === "too_large" && file.content === "") {
      return <LargeFilePrompt file={file} tabId={tabId} />;
    }
    return <BinaryFileView file={file} />;
  }

  if (isMarkdownPath(file.path)) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MarkdownEditorPane tabId={tabId} file={file} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <MonacoEditor
        file={file}
        onChange={(content) => updateContent(tabId, file.id, content)}
        onBlur={() => {
          if (editorAutosave === "onFocusChange") {
            void saveActiveFile(tabId);
          }
        }}
      />
      <ConflictDialog
        file={file}
        tabId={tabId}
        onResolved={() => {}}
      />
    </div>
  );
}
