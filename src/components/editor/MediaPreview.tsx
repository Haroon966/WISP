import { openPath } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mediaAssetUrl } from "@/lib/mediaCache";
import type { EditorFile } from "@/types/editor";

interface MediaPreviewProps {
  file: EditorFile;
}

export function MediaPreview({ file }: MediaPreviewProps) {
  const name = file.path.split("/").pop() ?? file.path;
  const isVideo = file.encoding === "video";
  const ready = file.mediaStatus === "ready" && file.absolutePath.length > 0;
  const src = ready ? mediaAssetUrl(file.absolutePath, file.version) : null;

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-3">
        <span className="truncate text-xs text-muted-foreground">
          {name}
          {file.mimeType ? (
            <span className="ml-2 text-muted-foreground/70">{file.mimeType}</span>
          ) : null}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 cursor-pointer px-2 text-xs"
          onClick={() => void openPath(file.path)}
        >
          <ExternalLinkIcon data-icon="inline-start" />
          Open externally
        </Button>
      </div>
      <div className="relative grid min-h-0 min-w-0 flex-1 place-items-center overflow-auto bg-muted/20 p-4">
        {file.mediaStatus === "error" ? (
          <p className="text-sm text-muted-foreground">
            Could not load preview. Try opening externally.
          </p>
        ) : null}
        {isVideo && src ? (
          <video
            src={src}
            controls
            playsInline
            preload="metadata"
            className="h-auto w-auto max-w-none shrink-0 rounded-md shadow-md"
            aria-label={`Video preview: ${name}`}
          />
        ) : null}
        {!isVideo && src ? (
          <img
            src={src}
            alt={name}
            decoding="async"
            className="h-auto w-auto max-w-none shrink-0"
            draggable={false}
          />
        ) : null}
        {!ready && file.mediaStatus !== "error" ? (
          <div
            className="pointer-events-none absolute inset-0 animate-pulse bg-muted/30"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
