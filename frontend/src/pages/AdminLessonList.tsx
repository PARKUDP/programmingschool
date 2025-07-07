import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Lesson {
  id: number;
  title: string;
  description: string;
}

const AdminLessonList: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // material_id
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch(`http://localhost:5050/api/lessons/by_material?material_id=${id}`)
      .then(res => res.json())
      .then(data => setLessons(data));
  }, [id]);

  const refresh = () => {
    fetch(`http://localhost:5050/api/lessons/by_material?material_id=${id}`)
      .then(res => res.json())
      .then(data => setLessons(data));
  };

  const handleCreate = () => {
    authFetch("http://localhost:5050/api/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        material_id: Number(id),
        title: newTitle,
        description,
      }),
    })
      .then(res => res.json())
      .then(data => {
        alert("レッスンを作成しました。");
        setLessons(prev => [...prev, { id: data.lesson_id, title: newTitle, description }]);
        setNewTitle("");
        setDescription("");
      });
  };

  const handleEdit = (lesson: Lesson) => {
    const title = prompt("新しいタイトル", lesson.title);
    if (!title) return;
    const desc = prompt("説明", lesson.description || "") ?? lesson.description;
    fetch(`http://localhost:5050/api/lessons/${lesson.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material_id: Number(id), title, description: desc }),
    }).then(refresh);
  };

  const handleDelete = (lessonId: number) => {
    if (!window.confirm("削除しますか？")) return;
    fetch(`http://localhost:5050/api/lessons/${lessonId}`, { method: "DELETE" }).then(refresh);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>レッスン一覧</h1>
      <ul>
        {lessons.map(lesson => (
          <li key={lesson.id}>
            {lesson.title} - <button onClick={() => navigate(`/admin/lessons/${lesson.id}/problems`)}>問題へ</button>
            <button onClick={() => handleEdit(lesson)} style={{ marginLeft: "0.5rem" }}>編集</button>
            <button onClick={() => handleDelete(lesson.id)} style={{ marginLeft: "0.5rem" }}>削除</button>
          </li>
        ))}
      </ul>
      <h2>新規レッスン作成</h2>
      <input
        type="text"
        placeholder="タイトル"
        value={newTitle}
        onChange={e => setNewTitle(e.target.value)}
      /><br />
      <textarea
        placeholder="説明"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <br />
      <button onClick={handleCreate}>作成</button>
    </div>
  );
};

export default AdminLessonList;