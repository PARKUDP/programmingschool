import React, { useRef, useEffect, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import ImageTool from '@editorjs/image';
import axios from 'axios';

const MaterialManagement: React.FC = () => {
  const editorRef = useRef<EditorJS | null>(null);
  const [title, setTitle] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const initializeEditor = () => {
      if (!editorRef.current) {
        editorRef.current = new EditorJS({
          holder: 'editorjs', 
          tools: {
            header: Header,
            list: List,
            paragraph: Paragraph,
            image: {
              class: ImageTool,
              config: {
                endpoints: {
                  byFile: '/api/admin/upload-image', 
                },
              },
            },
          },
        });
      }
    };

    initializeEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy?.(); 
        editorRef.current = null;
      }
    };
  }, []);

  const handleSave = async () => {
    if (!editorRef.current) return;

    setSaving(true);
    const savedData = await editorRef.current.save();
    try {
      await axios.post('/api/admin/material', {
        title,
        content: savedData, 
      });
      alert('教材が保存されました');
    } catch (error) {
      console.error('教材保存エラー:', error);
      alert('教材の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">教材管理</h1>
      <input
        type="text"
        placeholder="教材のタイトルを入力してください"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 mb-4 border border-gray-300 rounded"
      />
      <div id="editorjs" className="border border-gray-300 rounded p-2"></div>
      <button
        onClick={handleSave}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        disabled={saving}
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  );
};

export default MaterialManagement;
