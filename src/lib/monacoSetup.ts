import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

let configured = false;

export function setupMonacoWorkers() {
  if (configured) return;
  configured = true;

  self.MonacoEnvironment = {
    getWorker(_workerId, label) {
      if (label === "json") return new jsonWorker();
      if (label === "css" || label === "scss" || label === "less") {
        return new cssWorker();
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        return new htmlWorker();
      }
      if (label === "typescript" || label === "javascript") {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };
}

export function defineWispMonacoThemes() {
  // lazy import monaco to avoid loading before workers
  import("monaco-editor").then((monaco) => {
    const base = {
      base: "vs-dark" as const,
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0f172a",
        "editor.foreground": "#f8fafc",
        "editorLineNumber.foreground": "#64748b",
        "editor.selectionBackground": "#22c55e40",
        "editorCursor.foreground": "#22c55e",
        "editor.lineHighlightBackground": "#1e293b80",
      },
    };
    monaco.editor.defineTheme("wisp-dark", base);
    monaco.editor.defineTheme("wisp-light", {
      ...base,
      base: "vs",
      colors: {
        ...base.colors,
        "editor.background": "#f8fafc",
        "editor.foreground": "#0f172a",
        "editorLineNumber.foreground": "#94a3b8",
        "editor.lineHighlightBackground": "#e2e8f080",
      },
    });
  });
}
