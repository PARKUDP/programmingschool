import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

interface Submission {
  id: number;
  assignment_id: number;
  is_correct: number;
  feedback: string;
  code: string;
  submitted_at: string;
}

interface Assignment {
  id: number;
  title: string;
  lesson_id: number;
}

interface Lesson {
  id: number;
  title: string;
  material_id: number;
}

interface Material {
  id: number;
  title: string;
}

const SubmissionHistory: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [codeViewId, setCodeViewId] = useState<number | null>(null);
  const { user, authFetch } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, authFetch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [submissionRes, assignmentRes, lessonRes, materialRes] = await Promise.all([
        authFetch(`${apiEndpoints.submissions}/${user?.id}`),
        authFetch(apiEndpoints.assignments),
        authFetch(apiEndpoints.lessons),
        authFetch(apiEndpoints.materials),
      ]);

      const submissionData = await submissionRes.json();
      const assignmentData = await assignmentRes.json();
      const lessonData = await lessonRes.json();
      const materialData = await materialRes.json();

      setSubmissions(submissionData || []);
      setAssignments(assignmentData || []);
      setLessons(lessonData || []);
      setMaterials(materialData || []);
    } catch (err: any) {
      console.error("データ取得に失敗しました", err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentInfo = (assignmentId: number) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      return { title: `宿題 #${assignmentId}`, material: "", lesson: "" };
    }

    const lesson = lessons.find((l) => l.id === assignment.lesson_id);
    const material = lesson ? materials.find((m) => m.id === lesson.material_id) : null;

    return {
      title: assignment.title,
      material: material?.title || "教材なし",
      lesson: lesson?.title || "レッスンなし",
    };
  };

  if (!user) {
    return (
      <div className="page-container">
        <p className="message message-error">ログインしてください</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">提出履歴</h1>
        <p className="page-subtitle">あなたの提出した宿題の履歴を確認できます</p>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-secondary)", margin: "0" }}>まだ提出がありません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="card"
              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setExpandedId(expandedId === submission.id ? null : submission.id)
                }
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ fontSize: "1rem", fontWeight: "bold", color: submission.is_correct === 1 ? "#22c55e" : "#ef4444" }}>
                      {submission.is_correct === 1 ? "合格" : "不合格"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "1rem",
                          color: "var(--text-primary)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {getAssignmentInfo(submission.assignment_id).title}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.25rem",
                            backgroundColor: "rgba(59, 130, 246, 0.2)",
                            color: "rgb(96, 165, 250)",
                            fontWeight: "500",
                          }}
                        >
                          教材: {getAssignmentInfo(submission.assignment_id).material}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.25rem",
                            backgroundColor: "rgba(16, 185, 129, 0.2)",
                            color: "rgb(52, 211, 153)",
                            fontWeight: "500",
                          }}
                        >
                          レッスン: {getAssignmentInfo(submission.assignment_id).lesson}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        提出日時: {new Date(submission.submitted_at).toLocaleString("ja-JP")}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {submission.is_correct === 1
                      ? "すべてのテストケースに合格しました！"
                      : "いくつかのテストケースが失敗しました"}
                  </div>
                </div>
                <div style={{ fontSize: "1.5rem", color: "var(--text-secondary)" }}>
                  {expandedId === submission.id ? "▼" : "▶"}
                </div>
              </div>

              {expandedId === submission.id && (
                <div
                  style={{
                    marginTop: "1.5rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {/* コード表示ボタン */}
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      setCodeViewId(codeViewId === submission.id ? null : submission.id)
                    }
                    style={{ marginBottom: "1rem", width: "100%" }}
                  >
                    {codeViewId === submission.id ? "コードを非表示" : "提出したコードを表示"}
                  </button>

                  {codeViewId === submission.id && (
                    <div
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        padding: "1rem",
                        borderRadius: "0.5rem",
                        marginBottom: "1rem",
                        maxHeight: "400px",
                        overflowY: "auto",
                      }}
                    >
                      <pre
                        style={{
                          margin: "0",
                          fontSize: "0.85rem",
                          fontFamily: "monospace",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {submission.code}
                      </pre>
                    </div>
                  )}

                  {/* フィードバック表示 */}
                  <div style={{ marginTop: "1rem" }}>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        marginBottom: "0.5rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      結果フィードバック:
                    </div>
                    <div
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.2)",
                        padding: "1rem",
                        borderRadius: "0.5rem",
                        fontSize: "0.9rem",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: submission.is_correct ? "sans-serif" : "monospace",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {submission.feedback}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubmissionHistory;
