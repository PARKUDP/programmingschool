import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Editor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

const LessonManagement: React.FC = () => {
  const { materialId } = useParams();
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [editor] = useState(() => new Editor({
    extensions: [
      StarterKit,
      Image,
    ]
  }));

  const fetchLessons = async () => {
    const response = await fetch(`/api/admin/lessons/${materialId}`);
    const data = await response.json();
    setLessons(data);
  };

  const fetchLessonDetails = async (lessonId: number) => {
    const response = await fetch(`/api/admin/lesson/${lessonId}`);
    const data = await response.json();
    setSelectedLesson(data);
    setTitle(data.title);
    editor.commands.setContent(JSON.parse(data.description));
  };

  const handleSaveLesson = async () => {
    const content = editor.getJSON();
    if (selectedLesson) {
      await fetch(`/api/admin/lesson/${selectedLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: JSON.stringify(content) }),
      });
      alert('レッスンが更新されました');
    } else {
      await fetch(`/api/admin/lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          title,
          description: JSON.stringify(content),
        }),
      });
      alert('新しいレッスンが保存されました');
    }
    setTitle('');
    editor.commands.clearContent();
    fetchLessons();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();  
      }
    } catch (error) {
      console.error('画像のアップロードに失敗しました', error);
      alert('画像のアップロードに失敗しました');
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  return (
    <div>
      <h1>レッスン管理</h1>
      <input
        type="text"
        placeholder="レッスン名"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 rounded mb-4 w-full"
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="mb-4"
      />
      <EditorContent editor={editor} className="border p-4 rounded mb-4" />
      <button
        onClick={handleSaveLesson}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        レッスンを保存
      </button>
      <div className="mt-4">
        <h2>既存のレッスン</h2>
        <ul>
          {lessons.map((lesson: any) => (
            <li
              key={lesson.id}
              className="mb-2 cursor-pointer"
              onClick={() => fetchLessonDetails(lesson.id)}
            >
              <span>{lesson.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LessonManagement;
