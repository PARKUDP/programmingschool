import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Problem {
  id: number;
  lesson_id: number;
  title: string;
  markdown: string;
}

const AdminProblemList: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { authFetch } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    if (!lessonId) return;
    authFetch(
      `http://localhost:5050/api/problems/by_lesson?lesson_id=${lessonId}`
    )
      .then((res) => res.json())
      .then((data) => setProblems(data));
  }, [lessonId]);

  const refresh = () => {
    authFetch(
      `http://localhost:5050/api/problems/by_lesson?lesson_id=${lessonId}`
    )
      .then((res) => res.json())
      .then((data) => setProblems(data));
  };

  const handleEdit = (p: Problem) => {
    const title = prompt("新しいタイトル", p.title);
    if (title === null) return;
    const markdown = prompt("問題文", p.markdown ?? "") ?? p.markdown;
    authFetch(`http://localhost:5050/api/problems/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesson_id: Number(lessonId),
        title,
        markdown,
      }),
    }).then(refresh);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("削除しますか？")) return;
    authFetch(`http://localhost:5050/api/problems/${id}`, { method: "DELETE" }).then(
      refresh
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>問題一覧</h1>
      <ul>
        {problems.map((p) => (
          <li key={p.id}>
            {p.title}
            <button onClick={() => handleEdit(p)} style={{ marginLeft: "0.5rem" }}>
              編集
            </button>
            <button onClick={() => handleDelete(p.id)} style={{ marginLeft: "0.5rem" }}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminProblemList;
