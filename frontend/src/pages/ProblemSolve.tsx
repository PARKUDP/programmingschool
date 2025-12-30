import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import CodeEditor from "../components/CodeEditor";
import PageHeader from "../components/PageHeader";
import { useSnackbar } from "../components/SnackbarContext";
import ReactMarkdown from "react-markdown";

type ProblemType = "code" | "multiple_choice" | "essay";

interface Problem {
  id: number;
  lesson_id: number;
  title: string;
  markdown: string;
  type: ProblemType;
  created_at: string;
}

interface Choice {
  id: number;
  problem_id: number;
  choice_text: string;
  is_correct: number;
  display_order: number;
}

interface EssaySubmission {
  id: number;
  answer_text: string;
  is_graded: number;
  grade: string | null;
  feedback: string | null;
}

const ProblemSolve: React.FC = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const { showSnackbar } = useSnackbar();

  // State
  const [problem, setProblem] = useState<Problem | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Problem-specific states
  const [code, setCode] = useState("# Pythonのコードをここに書いてください\n");
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [essayText, setEssayText] = useState("");
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [essaySubmission, setEssaySubmission] = useState<EssaySubmission | null>(null);

  useEffect(() => {
    if (!problemId) return;

    // 問題を取得
    authFetch(`${apiEndpoints.problems}/${problemId}`)
      .then((res) => {
        if (!res.ok) throw new Error("問題の取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setProblem(data);

        // 客観式問題の選択肢を取得
        if (data.type === "multiple_choice") {
          return authFetch(`/api/problems/${problemId}/choices`).then((res) => res.json());
        }
        return null;
      })
      .then((choicesData) => {
        if (choicesData) {
          setChoices(Array.isArray(choicesData) ? choicesData : choicesData.choices || []);
        }

        // 文章問題の既存提出を取得
        if (problem?.type === "essay") {
          return authFetch(`/api/essay-submissions?problem_id=${problemId}`).then((res) =>
            res.json()
          );
        }
        return null;
      })
      .then((submissions) => {
        if (submissions && Array.isArray(submissions) && submissions.length > 0) {
          setEssaySubmission(submissions[0]);
          setEssayText(submissions[0].answer_text || "");
        }
      })
      .catch((err: any) => {
        setError(err.message || "エラーが発生しました");
        showSnackbar("エラーが発生しました", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [problemId, authFetch, showSnackbar]);

  const handleSubmitCode = async () => {
    if (!problem || !user) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await authFetch(apiEndpoints.submit, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: problem.id,
          code: code,
        }),
      });

      if (!res.ok) throw new Error("提出に失敗しました");

      const data = await res.json();
      setSubmitResult(data);
      showSnackbar(
        data.is_correct ? "テストケースに合格しました！" : "テストケースが失敗しました",
        data.is_correct ? "success" : "warning"
      );
    } catch (err: any) {
      const errorMsg = err.message || "提出に失敗しました";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitChoice = async () => {
    if (!problem || selectedChoice === null) {
      setError("選択肢を選んでください");
      showSnackbar("選択肢を選んでください", "error");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const selected = choices.find((c) => c.id === selectedChoice);
      const isCorrect = selected?.is_correct === 1;

      const res = await authFetch(apiEndpoints.submit, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: problem.id,
          code: JSON.stringify({ choice_id: selectedChoice, is_correct: isCorrect }),
        }),
      });

      if (!res.ok) throw new Error("提出に失敗しました");

      const data = await res.json();
      setSubmitResult({
        is_correct: isCorrect,
        feedback: isCorrect ? "正解です！" : "不正解です",
      });
      showSnackbar(isCorrect ? "正解です！" : "不正解です", isCorrect ? "success" : "warning");
    } catch (err: any) {
      const errorMsg = err.message || "提出に失敗しました";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEssay = async () => {
    if (!problem || !essayText.trim()) {
      setError("答案を入力してください");
      showSnackbar("答案を入力してください", "error");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const endpoint = essaySubmission
        ? `/api/essay-submissions/${essaySubmission.id}`
        : "/api/essay-submissions";
      const method = essaySubmission ? "PUT" : "POST";

      const body = essaySubmission
        ? JSON.stringify({ answer_text: essayText.trim() })
        : JSON.stringify({
            problem_id: problem.id,
            answer_text: essayText.trim(),
          });

      const res = await authFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) throw new Error("提出に失敗しました");

      const data = await res.json();

      if (essaySubmission) {
        setEssaySubmission({ ...essaySubmission, answer_text: essayText.trim() });
      } else {
        setEssaySubmission({
          id: data.id,
          answer_text: essayText.trim(),
          is_graded: 0,
          grade: null,
          feedback: null,
        });
      }

      setSubmitResult({
        is_correct: null,
        feedback: "答案を提出しました。先生による採点をお待ちください。",
      });
      showSnackbar("答案を提出しました", "success");
    } catch (err: any) {
      const errorMsg = err.message || "提出に失敗しました";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

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

  if (!problem) {
    return (
      <div className="page-container">
        <p className="message message-error">問題が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={problem.title}
        subtitle={`問題タイプ: ${
          problem.type === "code"
            ? "コード問題"
            : problem.type === "multiple_choice"
            ? "客観式問題"
            : "文章問題"
        }`}
        breadcrumbs={[
          { label: "問題", href: "/problems" },
          { label: problem.title },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* 左: 問題文 */}
        <div>
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>問題文</h3>
            <div
              style={{
                fontSize: "1rem",
                lineHeight: "1.6",
                color: "var(--text-primary)",
              }}
            >
              <ReactMarkdown>{problem.markdown}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* 右: 入力フォーム */}
        <div>
          <div className="card" style={{ padding: "1.5rem" }}>
            {error && <div className="message message-error">{error}</div>}
            {submitResult && (
              <div
                className={`message ${submitResult.is_correct ? "message-success" : submitResult.is_correct === false ? "message-warning" : "message-info"}`}
              >
                <strong>{submitResult.is_correct ? "提出完了" : submitResult.is_correct === false ? "結果" : "通知"}</strong>
                <p>{submitResult.feedback}</p>
              </div>
            )}

            {problem.type === "code" && (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>コードを入力</h3>
                <CodeEditor value={code} onChange={setCode} height={400} />
                <button
                  onClick={handleSubmitCode}
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ marginTop: "1rem", width: "100%" }}
                >
                  {submitting ? "提出中..." : "提出"}
                </button>
              </div>
            )}

            {problem.type === "multiple_choice" && (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>選択肢を選んでください</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {choices.map((choice) => (
                    <label
                      key={choice.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0.75rem 1rem",
                        border: `2px solid ${
                          selectedChoice === choice.id ? "#3b82f6" : "#e5e7eb"
                        }`,
                        borderRadius: "0.5rem",
                        backgroundColor:
                          selectedChoice === choice.id ? "#e0e7ff" : "#f9fafb",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="radio"
                        name="choice"
                        value={choice.id}
                        checked={selectedChoice === choice.id}
                        onChange={() => setSelectedChoice(choice.id)}
                        style={{ marginRight: "0.75rem", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "1rem" }}>{choice.choice_text}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleSubmitChoice}
                  disabled={submitting || selectedChoice === null}
                  className="btn btn-primary"
                  style={{ marginTop: "1rem", width: "100%" }}
                >
                  {submitting ? "提出中..." : "提出"}
                </button>
              </div>
            )}

            {problem.type === "essay" && (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>答案を入力</h3>
                {essaySubmission?.is_graded === 1 && (
                  <div
                    className={`message ${essaySubmission.grade === "A" || essaySubmission.grade === "B" ? "message-success" : "message-warning"}`}
                    style={{ marginBottom: "1rem" }}
                  >
                    <strong>採点済み</strong>
                    <p>成績: {essaySubmission.grade}</p>
                    {essaySubmission.feedback && <p>{essaySubmission.feedback}</p>}
                  </div>
                )}
                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  placeholder="答案を入力してください"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e0e7ff",
                    borderRadius: "0.5rem",
                    backgroundColor: "#f8fafc",
                    fontSize: "1rem",
                    fontFamily: "inherit",
                    minHeight: "250px",
                    resize: "vertical",
                  }}
                />
                <button
                  onClick={handleSubmitEssay}
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ marginTop: "1rem", width: "100%" }}
                >
                  {submitting ? "提出中..." : "提出"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemSolve;
