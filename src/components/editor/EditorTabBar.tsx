import { XIcon } from "lucide-react";
import type { EditorFile } from "@/types/editor";
import { cn } from "@/lib/utils";

interface EditorTabBarProps {
  files: EditorFile[];
  activeFileId: string | null;
  onSelect: (fileId: string) => void;
  onClose: (fileId: string) => void;
}

export function EditorTabBar({
  files,
  activeFileId,
  onSelect,
  onClose,
}: EditorTabBarProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex h-9 shrink-0 overflow-x-auto border-b border-border bg-muted/30">
      {files.map((file) => {
        const active = file.id === activeFileId;
        const name = file.path.split("/").pop() ?? file.path;
        return (
          <div
            key={file.id}
            className={cn(
              "group flex h-full max-w-[200px] shrink-0 items-center gap-1 border-r border-border/60 px-2 text-xs transition-colors",
              active
                ? "border-b-2 border-b-primary bg-background text-foreground"
                : "cursor-pointer text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              file.preview && "italic",
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 cursor-pointer truncate text-left"
              onClick={() => onSelect(file.id)}
              onDoubleClick={() => onSelect(file.id)}
            >
              {file.dirty ? "• " : ""}
              {name}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
              aria-label={`Close ${name}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(file.id);
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <XIcon className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
