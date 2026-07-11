import { generateManifest } from "material-icon-theme";

const manifest = generateManifest();

const iconModules = import.meta.glob(
  "../../node_modules/material-icon-theme/icons/*.svg",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const urlById = new Map<string, string>();
for (const [path, url] of Object.entries(iconModules)) {
  const file = path.slice(path.lastIndexOf("/") + 1);
  urlById.set(file.slice(0, -".svg".length), url);
}

const FALLBACK_FILE = urlById.get(manifest.file ?? "file") ?? "";
const FALLBACK_FOLDER = urlById.get(manifest.folder ?? "folder") ?? FALLBACK_FILE;
const FALLBACK_FOLDER_OPEN =
  urlById.get(manifest.folderExpanded ?? "folder-open") ?? FALLBACK_FOLDER;

function urlFor(id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  return urlById.get(id) ?? fallback;
}

/** Resolve Material Icon Theme URL for a file basename. */
export function materialFileIconUrl(fileName: string): string {
  const name = fileName.toLowerCase();
  const byName = manifest.fileNames?.[name];
  if (byName) return urlFor(byName, FALLBACK_FILE);

  // Longest compound extension first: foo.spec.ts → spec.ts → ts
  const dot = name.indexOf(".");
  if (dot >= 0) {
    let from = dot + 1;
    while (from < name.length) {
      const ext = name.slice(from);
      const byExt = manifest.fileExtensions?.[ext];
      if (byExt) return urlFor(byExt, FALLBACK_FILE);
      const next = name.indexOf(".", from);
      if (next < 0) break;
      from = next + 1;
    }
  }

  return FALLBACK_FILE;
}

/** Resolve Material Icon Theme URL for a folder basename. */
export function materialFolderIconUrl(
  folderName: string,
  expanded: boolean,
): string {
  const name = folderName.toLowerCase();
  if (expanded) {
    return urlFor(
      manifest.folderNamesExpanded?.[name] ?? manifest.folderExpanded,
      FALLBACK_FOLDER_OPEN,
    );
  }
  return urlFor(
    manifest.folderNames?.[name] ?? manifest.folder,
    FALLBACK_FOLDER,
  );
}

// ponytail: self-check
if (import.meta.env.DEV) {
  console.assert(urlById.size > 0, "material icon SVGs not loaded");
  console.assert(materialFileIconUrl("package.json").includes("nodejs"));
  console.assert(materialFileIconUrl("App.tsx").includes("react_ts"));
  console.assert(materialFileIconUrl("foo.spec.ts").includes("test-ts"));
  console.assert(materialFolderIconUrl("src", false).includes("folder-src"));
  console.assert(
    materialFolderIconUrl("src", true).includes("folder-src-open"),
  );
}
