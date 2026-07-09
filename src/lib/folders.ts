import {
  DownloadIcon,
  FileTextIcon,
  FilmIcon,
  FolderIcon,
  HomeIcon,
  ImageIcon,
  MusicIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";

export type PlaceFolder = {
  name: string;
  path: string;
  icon: LucideIcon;
};

export const PLACE_FOLDERS: PlaceFolder[] = [
  { name: "Home", path: "~", icon: HomeIcon },
  { name: "Documents", path: "~/Documents", icon: FileTextIcon },
  { name: "Downloads", path: "~/Downloads", icon: DownloadIcon },
  { name: "Music", path: "~/Music", icon: MusicIcon },
  { name: "Pictures", path: "~/Pictures", icon: ImageIcon },
  { name: "Videos", path: "~/Videos", icon: FilmIcon },
  { name: "Trash", path: "~/.local/share/Trash", icon: Trash2Icon },
];

export function getFolderIcon(path?: string): LucideIcon {
  const p = (path ?? "~").toLowerCase();

  if (p === "~" || /^~?\/home\/[^/]+$/.test(p) || /^~?\/users\/[^/]+$/i.test(p)) {
    return HomeIcon;
  }
  if (p.includes("documents")) return FileTextIcon;
  if (p.includes("downloads")) return DownloadIcon;
  if (p.includes("music")) return MusicIcon;
  if (p.includes("pictures") || p.includes("/photos")) return ImageIcon;
  if (p.includes("videos")) return FilmIcon;
  if (p.includes("trash")) return Trash2Icon;

  return FolderIcon;
}

export function normalizePath(path: string): string {
  return path
    .replace(/^\/home\/[^/]+/i, "~")
    .replace(/^\/Users\/[^/]+/i, "~");
}

export function pathMatchesFolder(
  cwd: string | undefined,
  folderPath: string,
): boolean {
  return normalizePath(cwd ?? "~") === normalizePath(folderPath);
}

export function getRelativeSubpath(
  cwd: string | undefined,
  placePath: string,
): string | null {
  const c = normalizePath(cwd ?? "~");
  const p = normalizePath(placePath);

  if (c === p) return null;
  if (c.startsWith(`${p}/`)) return c.slice(p.length + 1);

  return null;
}

export function tabNameFromCwd(cwd?: string): string {
  const c = normalizePath(cwd ?? "~");
  if (c === "~") return "Home";
  const segment = c.split("/").filter(Boolean).pop();
  return segment ?? "Home";
}

export function formatPlacesLabel(cwd?: string): {
  icon: LucideIcon;
  label: string;
} {
  const icon = getFolderIcon(cwd);
  const place = getActivePlace(cwd);

  if (!place) {
    const c = normalizePath(cwd ?? "~");
    if (c === "~") return { icon, label: "Home" };
    const segment = c.split("/").filter(Boolean).pop();
    return { icon, label: segment ?? "Places" };
  }

  const sub = getRelativeSubpath(cwd, place.path);
  return {
    icon: place.icon,
    label: sub ? `${place.name}/${sub}` : place.name,
  };
}

export function getActivePlace(cwd?: string): PlaceFolder | null {
  return PLACE_FOLDERS.find((place) => pathMatchesPlace(cwd, place.path)) ?? null;
}

export function pathMatchesPlace(cwd: string | undefined, placePath: string): boolean {
  const c = (cwd ?? "~").toLowerCase();
  const place = placePath.toLowerCase();

  if (place === "~") {
    return (
      c === "~" ||
      /^\/home\/[^/]+$/.test(c) ||
      /^\/users\/[^/]+$/i.test(c)
    );
  }

  const segment = place.replace(/^~\//, "");
  return (
    c === place ||
    c.endsWith(`/${segment}`) ||
    c.includes(`/${segment}/`) ||
    c === segment
  );
}
