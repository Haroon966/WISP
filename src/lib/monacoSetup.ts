import type * as Monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { getMonacoThemeColors } from "@/lib/theme";

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

export function applyWispMonacoThemes(monaco: typeof Monaco) {
  monaco.editor.defineTheme("wisp-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: getMonacoThemeColors(true),
  });
  monaco.editor.defineTheme("wisp-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: getMonacoThemeColors(false),
  });
}

export function defineWispMonacoThemes() {
  void import("monaco-editor").then(applyWispMonacoThemes);
}
