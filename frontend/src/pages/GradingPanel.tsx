import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "../components/SnackbarContext";
import PageHeader from "../components/PageHeader";
import { apiEndpoints } from "../config/api";
import ReactMarkdown from "react-markdown";

type ProblemType = "code" | "essay" | "choice";

interface ReviewSubmission {
  id: number;
  user_id: number;
  assignment_id: number;
  problem_type: ProblemType;
  is_correct: number | null;
  feedback: string | null;
  code?: string | null;
  answer_text?: string | null;
  selected_choice_id?: number | null;
  selected_choice_text?: string | null;
  submitted_at: string;
  username: string;
  assignment_title: string;
  question_text?: string | null;
}

interface Assignment {
  id: number;
  title: string;
  problem_type?: ProblemType;
}

interface UserSummary {
  userId: number;
  username: string;
  total: number;
  graded: number;
  ungraded: number;
  correct: number;
  incorrect: number;
  submissions: ReviewSubmission[];
}

interface Filters {
  graded: "all" | "ungraded" | "graded";
  assignmentId: number | null;
  problemType: ProblemType | "all";
}

const GradingPanel: React.FC = () => {
  const { authFetch, user } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ graded: "ungraded", assignmentId: null, problemType: "all" });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedSubmission, setSelectedSubmission] = useState<ReviewSubmission | null>(null);
  const [grade, setGrade] = useState("pass");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.is_admin && user?.role !== "teacher") {
      showSnackbar("採点権限がありません", "error");
      return;
    }

    loadData();
  }, [authFetch, user, showSnackbar, filters.problemType, filters.assignmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.problemType !== "all") params.append("problem_type", filters.problemType);
      if (filters.assignmentId) params.append("assignment_id", String(filters.assignmentId));

      const submissionsRes = await authFetch(`${apiEndpoints.submissionsReview}${params.toString() ? `?${params.toString()}` : ""}`);
      if (!submissionsRes.ok) {
        const text = await submissionsRes.text();
        console.error("提出取得レスポンス:", text.substring(0, 500));
        throw new Error(`提出取得エラー: ${submissionsRes.status}`);
      }
      const submissionsData = await submissionsRes.json();
      const submissionsList = Array.isArray(submissionsData)
        ? submissionsData
        : submissionsData.submissions || [];
      setSubmissions(submissionsList);

      const assignmentsRes = await authFetch(apiEndpoints.assignments);
      const assignmentsData = await assignmentsRes.json();
      const assignmentList = (Array.isArray(assignmentsData) ? assignmentsData : assignmentsData.assignments || []);
      setAssignments(assignmentList);
    } catch (err: any) {
      console.error("データ読み込みエラー:", err);
      showSnackbar(err.message || "データの読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (filters.graded === "graded" && sub.is_correct === null) return false;
    if (filters.graded === "ungraded" && sub.is_correct !== null) return false;
    if (filters.assignmentId && sub.assignment_id !== filters.assignmentId) return false;
    if (filters.problemType !== "all" && sub.problem_type !== filters.problemType) return false;
    return true;
  });

  const userSummaryMap = filteredSubmissions.reduce((acc, sub) => {
    const current: UserSummary =
      acc.get(sub.user_id) || {
        userId: sub.user_id,
        username: sub.username,
        total: 0,
        graded: 0,
        ungraded: 0,
        correct: 0,
        incorrect: 0,
        submissions: [],
      };

    const updated: UserSummary = {
      ...current,
      total: current.total + 1,
      graded: current.graded + (sub.is_correct === null ? 0 : 1),
      ungraded: current.ungraded + (sub.is_correct === null ? 1 : 0),
      correct: current.correct + (sub.is_correct === 1 ? 1 : 0),
      incorrect: current.incorrect + (sub.is_correct === 0 ? 1 : 0),
      submissions: [...current.submissions, sub],
    };

    acc.set(sub.user_id, updated);
    return acc;
  }, new Map<number, UserSummary>());

  const userSummaries = Array.from(userSummaryMap.values()).sort((a, b) => {
    if (b.ungraded !== a.ungraded) return b.ungraded - a.ungraded;
    if (b.total !== a.total) return b.total - a.total;
    return a.username.localeCompare(b.username);
  });

  const selectedUserSubmissions = selectedUserId ? userSummaryMap.get(selectedUserId)?.submissions || [] : [];

  useEffect(() => {
    if (filteredSubmissions.length === 0) {
      setSelectedUserId(null);
      setSelectedSubmission(null);
      return;
    }

    const hasSelectedUser = selectedUserId !== null && filteredSubmissions.some((s) => s.user_id === selectedUserId);
    const activeUserId = hasSelectedUser ? selectedUserId! : filteredSubmissions[0].user_id;

    if (!hasSelectedUser) {
      setSelectedUserId(activeUserId);
    }

    const userSubs = filteredSubmissions.filter((s) => s.user_id === activeUserId);
    if (!selectedSubmission || !userSubs.some((s) => s.id === selectedSubmission.id)) {
      const fallback = userSubs.find((s) => s.is_correct === null) || userSubs[0] || null;
      setSelectedSubmission(fallback || null);
    }
  }, [filteredSubmissions, selectedUserId, selectedSubmission]);

  useEffect(() => {
    if (!selectedSubmission) return;
    setGrade(selectedSubmission.is_correct === 0 ? "fail" : "pass");
    setFeedback(selectedSubmission.feedback || "");
    setSelectedUserId(selectedSubmission.user_id);
  }, [selectedSubmission]);

  const handleSelectSubmission = (submission: ReviewSubmission) => {
    setSelectedUserId(submission.user_id);
    setSelectedSubmission(submission);
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId);
    const userSubs = userSummaryMap.get(userId)?.submissions || [];
    const preferred = userSubs.find((s) => s.is_correct === null) || userSubs[0] || null;
    setSelectedSubmission(preferred || null);
    setFiltersOpen(true);
  };

  const handleSubmitGrade = async () => {
    if (!selectedSubmission) return;

    setSubmitting(true);
    try {
      const res = await authFetch(`${apiEndpoints.submissionsReview}/${selectedSubmission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_correct: grade === "pass" ? 1 : 0,
          feedback: feedback || "",
        }),
      });

      if (!res.ok) throw new Error("採点に失敗しました");

      const updatedSubmission: ReviewSubmission = {
        ...selectedSubmission,
        is_correct: grade === "pass" ? 1 : 0,
        feedback: feedback || "",
      };

      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubmission.id
            ? { ...sub, is_correct: updatedSubmission.is_correct, feedback: updatedSubmission.feedback }
            : sub
        )
      );
      setSelectedSubmission(updatedSubmission);
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
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "2rem" }}>
          {/* 左: ユーザーリスト＋フィルタ（開閉） */}
          <div>
            <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                <div>
                  <h3 style={{ margin: 0 }}>ユーザー</h3>
                  <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    提出 {filteredSubmissions.length}件 / ユーザー {userSummaries.length}人
                  </p>
                </div>
                <button
                  onClick={() => setFiltersOpen((v) => !v)}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: filtersOpen ? "#eef2ff" : "#ffffff",
                    color: "var(--text-primary)",
                    padding: "0.45rem 0.75rem",
                    borderRadius: "0.6rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  フィルタ{filtersOpen ? "を隠す" : "を表示"}
                </button>
              </div>

              {filtersOpen && (
                <div style={{ padding: "0.75rem", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: "0.75rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: "700", marginBottom: "0.4rem" }}>採点状況</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {( ["all", "ungraded", "graded"] as const).map((status) => (
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

                  <div>
                    <label style={{ display: "block", fontWeight: "700", marginBottom: "0.4rem" }}>問題タイプ</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {( ["all", "essay", "choice", "code"] as const).map((type) => (
                        <label key={type} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="problemType"
                            value={type}
                            checked={filters.problemType === type}
                            onChange={() => setFilters({ ...filters, problemType: type })}
                          />
                          <span>
                            {type === "all"
                              ? "すべて"
                              : type === "essay"
                              ? "記述"
                              : type === "choice"
                              ? "選択式"
                              : "コード"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontWeight: "700", marginBottom: "0.4rem" }}>宿題</label>
                    <select
                      value={filters.assignmentId || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          assignmentId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.55rem",
                        border: "2px solid #e0e7ff",
                        borderRadius: "0.5rem",
                        backgroundColor: "#fff",
                      }}
                    >
                      <option value="">すべての宿題</option>
                      {assignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <h4 style={{ margin: 0 }}>ユーザー一覧</h4>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>未採点順にソート</span>
                </div>
                <div style={{ display: "grid", gap: "0.75rem", maxHeight: "620px", overflowY: "auto" }}>
                  {userSummaries.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>条件に合う提出がありません</p>
                  ) : (
                    userSummaries.map((summary) => {
                      const isActive = selectedUserId === summary.userId;
                      const tone = summary.ungraded > 0 ? "#fef3c7" : summary.incorrect > 0 ? "#fee2e2" : "#e0f2fe";
                      return (
                        <button
                          key={summary.userId}
                          onClick={() => handleSelectUser(summary.userId)}
                          style={{
                            textAlign: "left",
                            border: `2px solid ${isActive ? "#6366f1" : "#e5e7eb"}`,
                            background: isActive ? "linear-gradient(135deg, #eef2ff, #e0f2fe)" : "#ffffff",
                            borderRadius: "0.9rem",
                            padding: "0.95rem",
                            cursor: "pointer",
                            boxShadow: isActive
                              ? "0 14px 30px rgba(99, 102, 241, 0.16)"
                              : "0 10px 24px rgba(0, 0, 0, 0.06)",
                            transition: "all 0.2s ease",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <div style={{ position: "absolute", inset: "8px", borderRadius: "0.65rem", background: tone, opacity: 0.35, pointerEvents: "none" }}></div>
                          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)" }}>{summary.username}</div>
                              <div style={{ marginTop: "0.25rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                提出 {summary.total}件 / 採点済 {summary.graded}件
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                              <span className="badge badge-warning">未 {summary.ungraded}</span>
                              <span className="badge badge-success">正 {summary.correct}</span>
                              <span className="badge badge-error">誤 {summary.incorrect}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 右: 採点画面 */}
          <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {!selectedUserId ? (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                左の条件で提出が見つかりません
              </p>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>採点</h3>
                    <p style={{ margin: "0.2rem 0 0", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                      {userSummaryMap.get(selectedUserId)?.username} の提出 {selectedUserSubmissions.length}件
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span className="badge badge-warning">未採点 {userSummaryMap.get(selectedUserId)?.ungraded ?? 0}</span>
                    <span className="badge badge-success">正解 {userSummaryMap.get(selectedUserId)?.correct ?? 0}</span>
                    <span className="badge badge-error">不正解 {userSummaryMap.get(selectedUserId)?.incorrect ?? 0}</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <h4 style={{ margin: 0 }}>提出を選択</h4>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>クリックで右側に表示</span>
                  </div>
                  <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    {selectedUserSubmissions.length === 0 ? (
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>このユーザーの提出がありません</p>
                    ) : (
                      selectedUserSubmissions.map((sub) => {
                        const isActive = selectedSubmission?.id === sub.id;
                        const statusColor = sub.is_correct === 1 ? "#16a34a" : sub.is_correct === 0 ? "#dc2626" : "#d97706";
                        const statusBg = sub.is_correct === 1 ? "#dcfce7" : sub.is_correct === 0 ? "#fee2e2" : "#fef9c3";
                        const statusText = sub.is_correct === 1 ? "正解" : sub.is_correct === 0 ? "不正解" : "未採点";
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleSelectSubmission(sub)}
                            style={{
                              textAlign: "left",
                              border: `2px solid ${isActive ? "#6366f1" : "#e5e7eb"}`,
                              background: isActive ? "linear-gradient(135deg, #eef2ff, #e0f2fe)" : "#ffffff",
                              borderRadius: "0.9rem",
                              padding: "0.95rem",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: isActive ? "0 14px 30px rgba(99, 102, 241, 0.16)" : "0 10px 24px rgba(0, 0, 0, 0.06)",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "6px", backgroundColor: statusColor, opacity: 0.9 }}></div>
                            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                                <span
                                  className={`badge ${sub.is_correct === 1 ? "badge-success" : sub.is_correct === 0 ? "badge-error" : "badge-warning"}`}
                                  style={{ backgroundColor: statusBg, color: statusColor, border: "1px solid rgba(0,0,0,0.04)", fontWeight: 700 }}
                                >
                                  {statusText}
                                </span>
                                <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                  {new Date(sub.submitted_at).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>

                              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)", lineHeight: 1.3 }}>
                                {sub.assignment_title}
                              </div>

                              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                <span style={{ padding: "0.25rem 0.55rem", borderRadius: "999px", backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                                  {sub.problem_type === "essay" ? "記述" : sub.problem_type === "choice" ? "選択式" : "コード"}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {selectedSubmission ? (
                  <>
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
                        問題: <strong>{selectedSubmission.assignment_title}</strong>
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                        提出日時: {" "}
                        <strong>
                          {new Date(selectedSubmission.submitted_at).toLocaleString("ja-JP")}
                        </strong>
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                        種別: <strong>{selectedSubmission.problem_type === "essay" ? "記述" : selectedSubmission.problem_type === "choice" ? "選択式" : "コード"}</strong>
                      </div>
                    </div>

                    {selectedSubmission.question_text && (
                      <div style={{ marginBottom: "1.25rem" }}>
                        <h4 style={{ marginBottom: "0.5rem" }}>問題文</h4>
                        <div
                          style={{
                            padding: "1rem",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            borderRadius: "0.5rem",
                            maxHeight: "240px",
                            overflowY: "auto",
                          }}
                        >
                          <ReactMarkdown>{selectedSubmission.question_text}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: "1.5rem" }}>
                      <h4 style={{ marginBottom: "0.75rem" }}>提出内容</h4>
                      {selectedSubmission.problem_type === "essay" && (
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
                          {selectedSubmission.answer_text || "(回答なし)"}
                        </div>
                      )}

                      {selectedSubmission.problem_type === "choice" && (
                        <div
                          style={{
                            padding: "1rem",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            borderRadius: "0.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                          }}
                        >
                          <div>
                            <strong>選択:</strong> {selectedSubmission.selected_choice_text || `ID: ${selectedSubmission.selected_choice_id ?? "?"}`}
                          </div>
                          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                            採点: {selectedSubmission.is_correct === 1 ? "正解" : selectedSubmission.is_correct === 0 ? "不正解" : "未採点"}
                          </div>
                        </div>
                      )}

                      {selectedSubmission.problem_type === "code" && (
                        <div
                          style={{
                            padding: "1rem",
                            backgroundColor: "#0f172a",
                            color: "#e2e8f0",
                            borderRadius: "0.5rem",
                            maxHeight: "340px",
                            overflowY: "auto",
                            fontFamily: "monospace",
                            fontSize: "0.9rem",
                          }}
                        >
                          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {selectedSubmission.code || "(コードなし)"}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                      <h4 style={{ marginBottom: "0.5rem" }}>フィードバック</h4>
                      <div
                        style={{
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          padding: "0.75rem",
                          minHeight: "60px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {selectedSubmission.feedback || "（フィードバックなし）"}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>判定を上書き</label>
                        <div style={{ display: "flex", gap: "1rem" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                              type="radio"
                              name="grade"
                              value="pass"
                              checked={grade === "pass"}
                              onChange={() => setGrade("pass")}
                            />
                            合格
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                              type="radio"
                              name="grade"
                              value="fail"
                              checked={grade === "fail"}
                              onChange={() => setGrade("fail")}
                            />
                            不合格
                          </label>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>フィードバックを編集</label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          style={{
                            width: "100%",
                            minHeight: "120px",
                            padding: "0.75rem",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            fontFamily: "inherit",
                          }}
                          placeholder="補足コメントや手動採点の理由を記入"
                        />
                      </div>

                      <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        自動採点結果が誤っている場合に手動で上書きできます。
                      </div>

                      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => {
                            if (!selectedSubmission) return;
                            setGrade(selectedSubmission.is_correct === 0 ? "fail" : "pass");
                            setFeedback(selectedSubmission.feedback || "");
                          }}
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
                  </>
                ) : (
                  <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "1.5rem 0" }}>
                    このユーザーの提出を選んでください
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GradingPanel;
