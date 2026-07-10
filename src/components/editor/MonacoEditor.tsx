import { useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import {
  applyWispMonacoThemes,
  defineWispMonacoThemes,
  setupMonacoWorkers,
} from "@/lib/monacoSetup";
import { activeMonacoTheme, onThemeChange } from "@/lib/theme";
import {
  getTerminalFontFamily,
  useSettingsStore,
} from "@/stores/useSettingsStore";
import type { EditorFile } from "@/types/editor";

interface MonacoEditorProps {
  file: EditorFile;
  onChange: (content: string) => void;
  onBlur?: () => void;
}

export function MonacoEditor({ file, onChange, onBlur }: MonacoEditorProps) {
  const terminalFontFamily = useSettingsStore(
    (s) => s.settings.terminalFontFamily,
  );
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [monacoTheme, setMonacoTheme] = useState(activeMonacoTheme);

  onChangeRef.current = onChange;

  const syncMonacoTheme = (monaco: typeof Monaco) => {
    applyWispMonacoThemes(monaco);
    const theme = activeMonacoTheme();
    monaco.editor.setTheme(theme);
    setMonacoTheme(theme);
  };

  const flushChange = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const value = ed.getValue();
    onChangeRef.current(value);
  };

  const scheduleChange = (value: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChangeRef.current(value);
    }, 300);
  };

  const onMount: OnMount = (ed, monaco) => {
    setupMonacoWorkers();
    editorRef.current = ed;
    monacoRef.current = monaco;
    syncMonacoTheme(monaco);
    const uri = monaco.Uri.parse(`wisp://${file.id}`);
    let model = monaco.editor.getModel(uri);
    if (!model) {
      model = monaco.editor.createModel(file.content, file.language, uri);
    }
    ed.setModel(model);
    ed.onDidBlurEditorText(() => {
      flushChange();
      onBlur?.();
    });
  };

  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const model = ed.getModel();
    if (!model) return;
    if (model.getValue() !== file.content) {
      model.setValue(file.content);
    }
    monaco.editor.setModelLanguage(model, file.language);
  }, [file.version, file.language]);

  useEffect(() => {
    defineWispMonacoThemes();
    return onThemeChange(() => {
      const monaco = monacoRef.current;
      if (monaco) syncMonacoTheme(monaco);
      else setMonacoTheme(activeMonacoTheme());
    });
  }, []);

  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
    },
    [],
  );

  if (file.encoding !== "utf8") return null;

  return (
    <div className="min-h-0 min-w-0 w-full flex-1">
      <Editor
        height="100%"
        language={file.language}
        theme={monacoTheme}
        defaultValue={file.content}
        onChange={(v) => scheduleChange(v ?? "")}
        onMount={onMount}
        options={{
          automaticLayout: true,
          fontFamily: getTerminalFontFamily(terminalFontFamily),
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "off",
          padding: { top: 8 },
        }}
      />
    </div>
  );
}
