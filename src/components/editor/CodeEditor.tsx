"use client";

import { useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface CodeEditorProps {
  language: "hcl" | "yaml";
  initialValue: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({
  language,
  initialValue,
  onChange,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;
      editor.onDidChangeModelContent(() => {
        const value = editor.getValue();
        onChange(value);
      });
    },
    [onChange]
  );

  // Monaco doesn't natively support HCL, map to a similar language
  const monacoLanguage = language === "hcl" ? "ruby" : "yaml";

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-[var(--border)]">
      <Editor
        height="100%"
        defaultLanguage={monacoLanguage}
        defaultValue={initialValue}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          fontSize: 14,
          lineNumbers: "on",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 12 },
        }}
      />
    </div>
  );
}
