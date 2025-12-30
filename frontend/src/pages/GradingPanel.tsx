import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "../components/SnackbarContext";
import PageHeader from "../components/PageHeader";
import ReactMarkdown from "react-markdown";

interface EssaySubmission {
  id: number;
  user_id: number;
  problem_id: number;
  answer_text: string;
  is_graded: number;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  username: string;
  problem_title: string;
}

interface Problem {
  id: number;
  title: string;
  markdown: string;
  type: string;
}

interface Filters {
  graded: "all" | "ungraded" | "graded";
  problemId: number | null;
}

const GradingPanel: React.FC = () => {
  const { authFetch, user } = useAuth();
  const { showSnackbar } = useSnackbar();

  // State
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ graded: "ungraded", problemId: null });

  // Grading state
  const [selectedSubmission, setSelectedSubmission] = useState<EssaySubmission | null>(null);
  const [grade, setGrade] = useState<string>("A");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.is_admin && user?.role !== "teacher") {
      showSnackbar("採点権限がありません", "error");
      return;
    }

    loadData();
  }, [authFetch, user, showSnackbar]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 文章問題の提出を取得
      const submissionsRes = await authFetch("/api/essay-submissions");
      if (!submissionsRes.ok) {
        const text = await submissionsRes.text();
        console.error("提出取得レスポンス:", text.substring(0, 500));
        throw new Error(`提出取得エラー: ${submissionsRes.status}`);
      }
      let submissionsData;
      try {
        submissionsData = await submissionsRes.json();
      } catch (e) {
        console.error("提出JSON パースエラー:", e);
        throw e;
      }
      const submissionsList = Array.isArray(submissionsData)
        ? submissionsData
        : submissionsData.submissions || [];
      setSubmissions(submissionsList);

      // 問題を取得（essay タイプのみ）
      const problemsRes = await authFetch("/api/problems/by_lesson");
      if (!problemsRes.ok) {
        const text = await problemsRes.text();
        console.error("問題取得レスポンス:", text.substring(0, 500));
        throw new Error(`問題取得エラー: ${problemsRes.status}`);
      }
      let problemsData;
      try {
        problemsData = await problemsRes.json();
      } catch (e) {
        console.error("問題JSON パースエラー:", e);
        throw e;
      }
      const problemsList = (Array.isArray(problemsData)
        ? problemsData
        : problemsData.problems || []).filter((p: Problem) => p.type === "essay");
      setProblems(problemsList);
    } catch (err: any) {
      console.error("データ読み込みエラー:", err);
      showSnackbar(err.message || "データの読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (filters.graded === "graded" && sub.is_graded === 0) return false;
    if (filters.graded === "ungraded" && sub.is_graded === 1) return false;
    if (filters.problemId && sub.problem_id !== filters.problemId) return false;
    return true;
  });

  const handleSelectSubmission = (submission: EssaySubmission) => {
    setSelectedSubmission(submission);
    setGrade(submission.grade || "A");
    setFeedback(submission.feedback || "");
  };

  const handleSubmitGrade = async () => {
    if (!selectedSubmission) return;

    if (!grade.trim()) {
      showSnackbar("成績を選択してください", "error");
      return;
    }

    setSubmitting(true);

    try {
      const res = await authFetch(`/api/essay-submissions/${selectedSubmission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: grade,
          feedback: feedback || "",
        }),
      });

      if (!res.ok) throw new Error("採点に失敗しました");

      // ローカルステートを更新
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubmission.id
            ? {
                ...sub,
                is_graded: 1,
                grade: grade,
                feedback: feedback,
                graded_at: new Date().toISOString(),
              }
            : sub
        )
      );

      setSelectedSubmission(null);
      setGrade("A");
      setFeedback("");
      showSnackbar("採点を保存しました", "success");
    } catch (err: any) {
      showSnackbar(err.message || "採点に失敗しました", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user?.is_admin && user?.role !== "teacher") {
    return (
      <div className="page-container">
        <p className="message message-error">採点権限がありません</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="採点管理"
        subtitle="学生の答案を採点します"
        breadcrumbs={[{ label: "管理" }, { label: "採点" }]}
      />

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "2rem" }}>
          {/* 左: フィルタと提出一覧 */}
          <div>
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1.5rem" }}>フィルタ</h3>

              {/* 採点状況フィルタ */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.75rem" }}>
                  採点状況
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(["all", "ungraded", "graded"] as const).map((status) => (
                    <label key={status} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="graded"
                        value={status}
                        checked={filters.graded === status}
                        onChange={() => setFilters({ ...filters, graded: status })}
                      />
                      <span>
                        {status === "all"
                          ? "すべて"
                          : status === "ungraded"
                          ? "未採点"
                          : "採点済み"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 問題フィルタ */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.75rem" }}>
                  問題
                </label>
                <select
                  value={filters.problemId || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      problemId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "2px solid #e0e7ff",
                    borderRadius: "0.5rem",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <option value="">すべての問題</option>
                  {problems.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 提出一覧 */}
              <div>
                <h4 style={{ marginBottom: "0.75rem" }}>
                  提出 ({filteredSubmissions.length})
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    maxHeight: "600px",
                    overflowY: "auto",
                  }}
                >
                  {filteredSubmissions.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      提出がありません
                    </p>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSelectSubmission(sub)}
                        style={{
                          padding: "0.75rem",
                          backgroundColor:
                            selectedSubmission?.id === sub.id ? "#e0e7ff" : "#f9fafb",
                          border: `2px solid ${
                            selectedSubmission?.id === sub.id ? "#3b82f6" : "#e5e7eb"
                          }`,
                          borderRadius: "0.5rem",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                          {sub.username}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {sub.problem_title}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                          {sub.is_graded ? (
                            <span style={{ color: "#10b981" }}>成績: {sub.grade}</span>
                          ) : (
                            <span style={{ color: "#ef4444" }}>未採点</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 右: 採点画面 */}
          {selectedSubmission ? (
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1.5rem" }}>採点</h3>

              {/* 提出者情報 */}
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#f9fafb",
                  borderRadius: "0.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  提出者: <strong>{selectedSubmission.username}</strong>
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  問題: <strong>{selectedSubmission.problem_title}</strong>
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  提出日時:{" "}
                  <strong>
                    {new Date(selectedSubmission.submitted_at).toLocaleString("ja-JP")}
                  </strong>
                </div>
              </div>

              {/* 答案表示 */}
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ marginBottom: "0.75rem" }}>答案</h4>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    maxHeight: "300px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    fontSize: "0.9rem",
                  }}
                >
                  {selectedSubmission.answer_text}
                </div>
              </div>

              {/* 採点フォーム */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* 成績入力 */}
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.75rem" }}>
                    成績 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem" }}>
                    {["A", "B", "C", "D", "F"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGrade(g)}
                        style={{
                          padding: "0.75rem",
                          backgroundColor: grade === g ? "#3b82f6" : "#f9fafb",
                          color: grade === g ? "white" : "var(--text-primary)",
                          border: `2px solid ${grade === g ? "#3b82f6" : "#d1d5db"}`,
                          borderRadius: "0.5rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* フィードバック入力 */}
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.75rem" }}>
                    フィードバック
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="学生へのフィードバックを入力してください"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "2px solid #e0e7ff",
                      borderRadius: "0.5rem",
                      backgroundColor: "#f8fafc",
                      fontSize: "1rem",
                      fontFamily: "inherit",
                      minHeight: "120px",
                      resize: "vertical",
                    }}
                  />
                </div>

                {/* 保存ボタン */}
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "white",
                      color: "var(--text-primary)",
                      border: "2px solid var(--border)",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSubmitGrade}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{
                      padding: "0.75rem 1.5rem",
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                左から提出を選択して採点してください
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GradingPanel;
