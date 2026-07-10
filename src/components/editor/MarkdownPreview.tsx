import { useEffect, useMemo, useRef, useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import mermaid from "mermaid";
import { marked, Renderer, type Tokens } from "marked";
import { isDarkTheme, onThemeChange } from "@/lib/theme";
import type { EditorFile } from "@/types/editor";
import {
  markdownFileDir,
  resolveMarkdownAssetUrl,
} from "@/lib/markdown";

interface MarkdownPreviewProps {
  file: EditorFile;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function createRenderer(fileDir: string): Renderer {
  const base = new Renderer();
  const renderer = new Renderer();

  renderer.image = function ({ href, title, text }: Tokens.Image) {
    const src = resolveMarkdownAssetUrl(fileDir, href);
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(text)}"${titleAttr} loading="lazy" />`;
  };

  renderer.link = function ({ href, title, tokens }: Tokens.Link) {
    const text = this.parser.parseInline(tokens);
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:")
    ) {
      return `<a href="${escapeAttr(href)}"${titleAttr} rel="noopener noreferrer">${text}</a>`;
    }
    const resolved = resolveMarkdownAssetUrl(fileDir, href);
    return `<a href="${escapeAttr(resolved)}" data-open-path="${escapeAttr(href)}"${titleAttr}>${text}</a>`;
  };

  renderer.code = function (token: Tokens.Code) {
    if (token.lang === "mermaid") {
      return `<div class="mermaid-diagram" data-source="${encodeURIComponent(token.text)}"></div>\n`;
    }
    return base.code.call(this, token);
  };

  return renderer;
}

function parseMarkdown(content: string, fileDir: string): string {
  return marked.parse(content, {
    gfm: true,
    async: false,
    renderer: createRenderer(fileDir),
  }) as string;
}

export function MarkdownPreview({ file }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [themeEpoch, setThemeEpoch] = useState(0);
  const fileDir = useMemo(() => markdownFileDir(file.path), [file.path]);
  const [debouncedContent, setDebouncedContent] = useState(file.content);

  useEffect(() => onThemeChange(() => setThemeEpoch((n) => n + 1)), []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContent(file.content), 200);
    return () => clearTimeout(timer);
  }, [file.content]);

  const html = useMemo(
    () => parseMarkdown(debouncedContent, fileDir),
    [debouncedContent, fileDir],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor || !container.contains(anchor)) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      event.preventDefault();
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:")
      ) {
        void openPath(href);
        return;
      }
      const openPathAttr = anchor.getAttribute("data-open-path") ?? href;
      const absolute = openPathAttr.startsWith("/")
        ? openPathAttr
        : fileDir
          ? `${fileDir}/${openPathAttr}`
          : openPathAttr;
      void openPath(absolute);
    };

    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, [fileDir, html]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkTheme() ? "dark" : "default",
      securityLevel: "strict",
    });

    const nodes = container.querySelectorAll<HTMLElement>(".mermaid-diagram");
    let cancelled = false;

    void (async () => {
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        const source = decodeURIComponent(el.dataset.source ?? "");
        const id = `wisp-mermaid-${file.id}-${i}`;
        try {
          const { svg } = await mermaid.render(id, source);
          if (!cancelled) el.innerHTML = svg;
        } catch {
          if (!cancelled) {
            const escaped = source
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            el.innerHTML = `<pre class="mermaid-error">${escaped}</pre>`;
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedContent, file.id, file.version, html, themeEpoch]);

  return (
    <div className="min-h-0 min-w-0 w-full flex-1 overflow-x-auto overflow-y-auto">
      <div
        ref={containerRef}
        className="markdown-preview p-4 sm:p-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
