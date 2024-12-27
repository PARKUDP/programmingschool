import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor: React.FC = () => {
  const [code, setCode] = useState('');

  const handleRunCode = async () => {
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <div>
      <Editor
        height="400px"
        defaultLanguage="python"
        defaultValue="# コードを書いてください。"
        onChange={(value) => setCode(value || '')}
      />
      <button onClick={handleRunCode}>実行</button>
    </div>
  );
};

export default CodeEditor;
