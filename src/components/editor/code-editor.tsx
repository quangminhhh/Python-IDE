// src/components/editor/code-editor.tsx
"use client";

import dynamic from "next/dynamic";
import * as React from "react";

// chỉ client: tắt SSR
const MonacoEditor = dynamic(async () => (await import("@monaco-editor/react")).default, {
  ssr: false,
});

export type CodeEditorProps = {
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  height?: number | string;
  colorScheme?: "light" | "dark";
  onReady?: () => void; // NEW
};

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  height = "100%",
  colorScheme = "light",
  onReady, // NEW
}: CodeEditorProps) {
  const monacoTheme = colorScheme === "dark" ? "vs-dark" : "vs";

  return (
    <div className="h-full min-h-0">
      <MonacoEditor
        language="python"
        theme={monacoTheme}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          readOnly,
          automaticLayout: true,
          // Hide all scrollbars
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
          },
        }}
        height={height}
        // NEW: khi editor đã mount xong, báo về AppShell
        onMount={() => onReady?.()}
      />
    </div>
  );
}
