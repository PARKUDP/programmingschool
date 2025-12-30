import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

interface Problem {
  id: number;
  lesson_id: number;
  title: string;
  markdown: string;
  type: string;
  created_at: string;
}

const AdminProblemList: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { authFetch } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    if (!lessonId) return;
    authFetch(
      `${apiEndpoints.problems}/by_lesson?lesson_id=${lessonId}`
    )
      .then((res) => res.json())
      .then((data) => setProblems(data));
  }, [lessonId]);

  const refresh = () => {
    authFetch(
      `${apiEndpoints.problems}/by_lesson?lesson_id=${lessonId}`
    )
      .then((res) => res.json())
      .then((data) => setProblems(data));
  };

  const handleEdit = (p: Problem) => {
    const title = prompt("新しいタイトル", p.title);
    if (title === null) return;
    const markdown = prompt("問題文", p.markdown ?? "") ?? p.markdown;
    const typeList = ["code", "multiple_choice", "essay"];
    const currentTypeIdx = typeList.indexOf(p.type || "code");
    const newTypeIdx = prompt("問題タイプ (0:コード, 1:客観式, 2:文章)", String(currentTypeIdx));
    if (newTypeIdx === null) return;
    const newType = typeList[parseInt(newTypeIdx)] || "code";
    
    authFetch(`${apiEndpoints.problems}/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesson_id: Number(lessonId),
        title,
        markdown,
        type: newType,
      }),
    }).then(refresh);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("削除しますか？")) return;
    authFetch(`${apiEndpoints.problems}/${id}`, { method: "DELETE" }).then(
      refresh
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>問題一覧</h1>
      <ul>
        {problems.map((p) => {
          const typeLabels: Record<string, string> = {
            code: "コード",
            multiple_choice: "客観式",
            essay: "文章",
          };
          return (
            <li key={p.id} style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontWeight: "600" }}>{p.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    {typeLabels[p.type] || "コード"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => handleEdit(p)} className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
                    編集
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="btn btn-danger" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
                    削除
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AdminProblemList;
