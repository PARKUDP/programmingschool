import React, { useState } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const MaterialManagement: React.FC = () => {
  const [title, setTitle] = useState('');
  const [editor] = useState(() => new Editor({ extensions: [StarterKit] }));

  const handleSave = async () => {
    const content = editor.getJSON();
    await fetch(`${API_URL}/api/admin/material`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: JSON.stringify(content) }),
    });
    alert('教材が保存されました');
  };

  return (
    <div>
      <h1>教材管理</h1>
      <input
        type="text"
        placeholder="教材名"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 rounded mb-4 w-full"
      />
      <EditorContent editor={editor} className="border p-4 rounded mb-4" />
      <button
        onClick={handleSave}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        保存
      </button>
    </div>
  );
};

export default MaterialManagement;
