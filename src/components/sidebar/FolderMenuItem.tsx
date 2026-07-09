import { useCallback, useState } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFolderIcon, pathMatchesFolder } from "@/lib/folders";
import { listSubfolders } from "@/lib/fs";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderMenuItemProps {
  name: string;
  path: string;
  icon: LucideIcon;
  activeCwd?: string;
  onOpen: (name: string, path: string) => void;
}

export function FolderMenuItem({
  name,
  path,
  icon: Icon,
  activeCwd,
  onOpen,
}: FolderMenuItemProps) {
  const [children, setChildren] = useState<
    Awaited<ReturnType<typeof listSubfolders>> | null
  >(null);
  const [loading, setLoading] = useState(false);
  const active = pathMatchesFolder(activeCwd, path);

  const load = useCallback(async () => {
    if (children !== null || loading) return;
    setLoading(true);
    try {
      setChildren(await listSubfolders(path));
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [children, loading, path]);

  if (children?.length === 0) {
    return (
      <DropdownMenuItem
        className={cn("cursor-pointer gap-3", active && "bg-sidebar-accent")}
        onClick={() => onOpen(name, path)}
      >
        <Icon className="size-4" />
        <span className="truncate">{name}</span>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className={cn("cursor-pointer gap-3", active && "bg-sidebar-accent")}
        onPointerEnter={load}
      >
        <Icon className="size-4" />
        <span className="truncate">{name}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
        <DropdownMenuItem
          className="cursor-pointer gap-3"
          onClick={() => onOpen(name, path)}
        >
          <Icon className="size-4" />
          <span className="truncate">Open {name}</span>
        </DropdownMenuItem>
        {loading ? (
          <DropdownMenuItem disabled className="text-muted-foreground">
            Loading…
          </DropdownMenuItem>
        ) : null}
        {children && children.length > 0 ? <DropdownMenuSeparator /> : null}
        {children?.map((child) => (
          <FolderMenuItem
            key={child.path}
            name={child.name}
            path={child.path}
            icon={getFolderIcon(child.path)}
            activeCwd={activeCwd}
            onOpen={onOpen}
          />
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
