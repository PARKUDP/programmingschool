import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor: React.FC = () => {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');


  const handleRunCode = async () => {
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      setOutput(data.stdout || data.stderr || 'No output');
    } catch (error) {
      console.error('Error running code:', error);
      setOutput('An error occurred while executing the code.');
    }
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
