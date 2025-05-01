import React from "react";
import Editor from "@monaco-editor/react";

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange }) => {
  return (
    <Editor
      height="300px"
      defaultLanguage="python"
      theme="vs-dark"
      value={value}
      onChange={(val) => onChange(val || "")}
      options={{
        fontSize: 14,
        tabSize: 4,
        minimap: { enabled: false },
        wordWrap: "on",
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        acceptSuggestionOnEnter: "on",
      }}
    />
  );
};

export default CodeEditor;
