import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

interface Assignment {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  input_example: string;
  created_at: string;
  lesson_title?: string;
  material_title?: string;
}

const AdminAssignmentList: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessonMap, setLessonMap] = useState<Record<number, string>>({});
  const [materialMap, setMaterialMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [authFetch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 宿題を取得
      const assignRes = await authFetch(apiEndpoints.assignments);
      const assignData = await assignRes.json();
      
      // レッスン情報を取得
      const lessonRes = await authFetch(apiEndpoints.lessons);
      const lessonData = await lessonRes.json();
      const lessonMap: Record<number, string> = {};
      lessonData.forEach((l: any) => {
        lessonMap[l.id] = l.title;
      });
      
      // 教材情報を取得（APIがあれば）
      const materialMap: Record<number, string> = {};
      try {
        const matRes = await authFetch(`${apiEndpoints.baseUrl}/api/materials`);
        if (matRes.ok) {
          const matData = await matRes.json();
          matData.forEach((m: any) => {
            materialMap[m.id] = m.title;
          });
        }
      } catch (e) {
        // 無視
      }

      setAssignments(assignData || []);
      setLessonMap(lessonMap);
      setMaterialMap(materialMap);
      setError("");
    } catch (err: any) {
      setError("データの取得に失敗しました: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("本当にこの宿題を削除しますか？")) return;
    try {
      const res = await authFetch(`${apiEndpoints.assignments}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("削除失敗");
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      setError("⚠️ " + (err.message || "削除に失敗しました"));
    }
  };

  const handleTestCaseClick = (assignmentId: number) => {
    navigate(`/admin/assignments/${assignmentId}/testcases/create`);
  };

  if (!user?.is_admin) {
    return (
      <div className="page-container">
        <p className="message message-error">権限がありません</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📋 宿題管理</h1>
        <p className="page-subtitle">作成した宿題を管理します</p>
      </div>

      {error && <div className="message message-error">{error}</div>}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-title">🆕 新規宿題作成</div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/admin/materials")}
          style={{ width: "100%" }}
        >
          📝 新しい宿題を作成
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</p>
          <p style={{ color: "var(--text-secondary)" }}>宿題がまだ作成されていません</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))", gap: "1.5rem" }}>
          {assignments.map((assignment) => (
            <div key={assignment.id} className="card">
              {/* ヘッダー */}
              <div style={{ marginBottom: "1rem" }}>
                <div className="card-title">{assignment.title}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                  <div>📚 {lessonMap[assignment.lesson_id] || `レッスン #${assignment.lesson_id}`}</div>
                  {materialMap[assignment.lesson_id] && (
                    <div>📖 {materialMap[assignment.lesson_id]}</div>
                  )}
                  <div>📅 {new Date(assignment.created_at).toLocaleDateString("ja-JP")}</div>
                </div>
              </div>

              {/* 説明 */}
              {assignment.description && (
                <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "rgba(102, 126, 234, 0.1)", borderRadius: "0.5rem" }}>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
                    <strong>説明:</strong> {assignment.description}
                  </p>
                </div>
              )}

              {/* 問題文 */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  ❓ 問題文:
                </label>
                <div style={{
                  padding: "0.75rem",
                  backgroundColor: "rgba(30, 41, 59, 0.3)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  maxHeight: "150px",
                  overflowY: "auto",
                  fontSize: "0.9rem",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "var(--text-secondary)"
                }}>
                  {assignment.question_text || "問題文なし"}
                </div>
              </div>

              {/* 入力例 */}
              {assignment.input_example && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                    📥 入力例:
                  </label>
                  <div style={{
                    padding: "0.75rem",
                    backgroundColor: "rgba(30, 41, 59, 0.3)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.9rem",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "var(--text-secondary)"
                  }}>
                    {assignment.input_example}
                  </div>
                </div>
              )}

              {/* アクション */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleTestCaseClick(assignment.id)}
                >
                  🧪 テストケース
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(assignment.id)}
                >
                  🗑️ 削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAssignmentList;
