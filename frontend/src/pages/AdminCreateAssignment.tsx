import React, { useEffect, useState } from "react";

interface Lesson { id: number; title: string; }

const AdminCreateAssignment: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const params = new URLSearchParams(window.location.search);
  const initialLesson = params.get("lesson_id");
  const [lessonId, setLessonId] = useState<number | "">(initialLesson ? Number(initialLesson) : "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [inputExample, setInputExample] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("http://localhost:5050/api/lessons")
      .then(res => res.json())
      .then(data => setLessons(data));
  }, []);

  const handleSubmit = () => {
    if (!lessonId) return;
    const form = new FormData();
    form.append("lesson_id", String(lessonId));
    form.append("title", title);
    form.append("description", description);
    form.append("question_text", questionText);
    form.append("input_example", inputExample);
    if (file) form.append("file", file);

    fetch("http://localhost:5050/api/assignments", {
      method: "POST",
      body: form,
    })
      .then(res => res.json())
      .then(() => {
        alert("宿題を作成しました");
        setTitle("");
        setDescription("");
        setQuestionText("");
        setInputExample("");
        setLessonId("");
        setFile(null);
      });
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>宿題作成</h1>
      <div>
        <select value={lessonId} onChange={e => setLessonId(Number(e.target.value))}>
          <option value="">レッスン選択</option>
          {lessons.map(l => (
            <option key={l.id} value={l.id}>{l.title}</option>
          ))}
        </select>
      </div>
      <div>
        <input placeholder="タイトル" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div>
        <textarea placeholder="説明" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div>
        <textarea placeholder="問題文" value={questionText} onChange={e => setQuestionText(e.target.value)} />
      </div>
      <div>
        <input placeholder="入力例" value={inputExample} onChange={e => setInputExample(e.target.value)} />
      </div>
      <div>
        <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
      </div>
      <button onClick={handleSubmit}>作成</button>
    </div>
  );
};

export default AdminCreateAssignment;
