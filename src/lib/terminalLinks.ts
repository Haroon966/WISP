import type { ILink, ILinkProvider, Terminal } from "@xterm/xterm";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { statFile } from "@/lib/fs";

const URL_RE = /https?:\/\/[^\s<>"'`{}|\\^[\]]+/g;
const PATH_RE = /(?:~\/|\/)[^\s;|&<>"'`{}\\]+/g;

export interface TerminalLinkHandlers {
  onPathClick?: (path: string, kind: "file" | "dir") => void;
}

function lineText(term: Terminal, y: number): string {
  const line = term.buffer.active.getLine(y);
  return line?.translateToString(true) ?? "";
}

function linksFromRegex(
  text: string,
  y: number,
  re: RegExp,
  onActivate: (value: string) => void,
): ILink[] {
  const links: ILink[] = [];
  for (const match of text.matchAll(re)) {
    const value = match[0];
    const start = match.index ?? 0;
    links.push({
      text: value,
      range: {
        start: { x: start, y },
        end: { x: start + value.length, y },
      },
      activate: () => onActivate(value),
    });
  }
  return links;
}

async function activatePath(path: string, handlers?: TerminalLinkHandlers) {
  try {
    const stat = await statFile(path);
    if (handlers?.onPathClick) {
      handlers.onPathClick(stat.path, stat.kind);
      return;
    }
    void openPath(stat.path);
  } catch {
    void openPath(path);
  }
}

export function registerTerminalLinks(
  term: Terminal,
  handlers?: TerminalLinkHandlers,
) {
  const providers: ILinkProvider[] = [
    {
      provideLinks(y, callback) {
        const text = lineText(term, y - 1);
        callback(linksFromRegex(text, y - 1, URL_RE, (uri) => void openUrl(uri)));
      },
    },
    {
      provideLinks(y, callback) {
        const text = lineText(term, y - 1);
        callback(
          linksFromRegex(text, y - 1, PATH_RE, (path) => {
            void activatePath(path, handlers);
          }),
        );
      },
    },
  ];

  for (const provider of providers) {
    term.registerLinkProvider(provider);
  }
}
