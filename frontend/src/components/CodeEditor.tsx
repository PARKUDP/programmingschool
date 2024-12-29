import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CodeEditor: React.FC = () => {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');

  const handleRunCode = async () => {
    const response = await fetch(`${API_URL}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    setOutput(data.stdout || data.stderr || 'No output');
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
      <div className="mt-4 p-4 border rounded">
        <h3>実行結果:</h3>
        <pre>{output}</pre>
      </div>
    </div>
  );
};

export default CodeEditor;
