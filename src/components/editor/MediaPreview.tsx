import { openPath } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mediaAssetUrl } from "@/lib/mediaCache";
import type { EditorFile } from "@/types/editor";
import { cn } from "@/lib/utils";

interface MediaPreviewProps {
  file: EditorFile;
}

export function MediaPreview({ file }: MediaPreviewProps) {
  const name = file.path.split("/").pop() ?? file.path;
  const isVideo = file.encoding === "video";
  const ready = file.mediaStatus === "ready" && file.absolutePath.length > 0;
  const src = ready ? mediaAssetUrl(file.absolutePath, file.version) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
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
      <div
        className={cn(
          "relative grid min-h-0 min-w-0 flex-1 place-items-center overflow-hidden p-4",
          isVideo ? "bg-black/90" : "bg-muted/20",
        )}
      >
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
            className="max-h-full max-w-full rounded-md shadow-md"
            aria-label={`Video preview: ${name}`}
          />
        ) : null}
        {!isVideo && src ? (
          <img
            src={src}
            alt={name}
            decoding="async"
            className="max-h-full max-w-full object-contain"
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
