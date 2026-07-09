import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditorStore } from "@/stores/useEditorStore";
import type { EditorFile } from "@/types/editor";

interface ConflictDialogProps {
  file: EditorFile | null;
  tabId: string;
  onResolved: () => void;
}

export function ConflictDialog({ file, tabId, onResolved }: ConflictDialogProps) {
  const resolveConflict = useEditorStore((s) => s.resolveConflict);

  if (!file?.conflict) return null;

  return (
    <Dialog open onOpenChange={() => onResolved()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File changed on disk</DialogTitle>
          <DialogDescription>
            {file.path.split("/").pop()} was modified externally. You have unsaved
            changes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              void resolveConflict(tabId, file.id, "keep").then(onResolved);
            }}
          >
            Keep my version
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void resolveConflict(tabId, file.id, "reload").then(onResolved);
            }}
          >
            Reload from disk
          </Button>
          <Button
            onClick={() => {
              void resolveConflict(tabId, file.id, "saveAndReload").then(onResolved);
            }}
          >
            Save &amp; reload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
