import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CodeEditor from "../components/CodeEditor";
import PageHeader from "../components/PageHeader";
import { useSnackbar } from "../components/SnackbarContext";
import ReactMarkdown from "react-markdown";
import { apiEndpoints } from "../config/api";

type ProblemType = "choice" | "essay" | "code";

interface Assignment {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  problem_type: ProblemType;
  input_example?: string;
  expected_output?: string;
  file_path?: string;
  created_at: string;
  exec_mode?: "stdin" | "function";
  entry_function?: string | null;
}

interface ChoiceOption {
  id: number;
  option_text: string;
  option_order: number;
  is_correct: number;
}

interface Submission {
  id: number;
  is_correct: number | null;
  feedback: string | null;
  code?: string;
  answer_text?: string;
  selected_choice_id?: number;
}

const ProblemSolve: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [choiceOptions, setChoiceOptions] = useState<ChoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);

  const [code, setCode] = useState("# Pythonのコードをここに書いてください\n");
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState<{ all_passed: number; cases: { input: string; expected_output: string; output: string; passed: boolean; }[] } | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [essayText, setEssayText] = useState("");

  useEffect(() => {
    if (!assignmentId) return;
    
    const abortController = new AbortController();
    fetchAssignmentData(abortController);
    
    return () => {
      abortController.abort();
    };
  }, [assignmentId]);

  const fetchAssignmentData = async (abortController?: AbortController) => {
    const signal = abortController?.signal;
    
    try {
      const assignmentRes = await authFetch(`${apiEndpoints.assignments}/${assignmentId}`, { signal });
      if (!assignmentRes.ok) throw new Error("宿題の取得に失敗しました");
      const assignmentData = await assignmentRes.json();
      // 既存提出の取得
      const submissionRes = await authFetch(
        `${apiEndpoints.submissions}?assignment_id=${assignmentId}`,
        { signal }
      );
      if (submissionRes.ok) {
        const submissions = await submissionRes.json();
        if (Array.isArray(submissions) && submissions.length > 0) {
          const submission = submissions[0];
          setExistingSubmission(submission);
          if (submission.code) setCode(submission.code);
          if (submission.answer_text) setEssayText(submission.answer_text);
          if (submission.selected_choice_id) setSelectedChoice(submission.selected_choice_id);
        }
      }

      // 選択肢を常に取得して、タイプが無い場合のフォールバックに使う
      let fetchedChoices: ChoiceOption[] = [];
      const choicesRes = await authFetch(
        `${apiEndpoints.assignments}/${assignmentId}/choices`,
        { signal }
      );
      if (choicesRes.ok) {
        const choices = await choicesRes.json();
        fetchedChoices = Array.isArray(choices) ? choices : choices.choices || [];
        setChoiceOptions(fetchedChoices);
      }

      const finalType: ProblemType = (assignmentData.problem_type as ProblemType) || (fetchedChoices.length > 0 ? "choice" : "code");
      setAssignment({ ...assignmentData, problem_type: finalType });
    } catch (err: any) {
      // AbortErrorまたはキャンセルエラーは無視（コンポーネントのアンマウント時の正常な動作）
      if (err.name === 'AbortError' || err.type === 'cancelation' || signal?.aborted) {
        // 開発環境でのキャンセルは正常な動作なので何もしない
        return;
      }
      setError(err.message || "エラーが発生しました");
      showSnackbar("エラーが発生しました", "error");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const handleSubmitCode = async () => {
    if (!assignment || !user) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await authFetch(apiEndpoints.submit, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignment.id,
          code: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || "提出に失敗しました";
        throw new Error(errorMsg);
      }
      showSnackbar(
        data.is_correct ? "テストケースに合格しました！" : "テストケースが失敗しました",
        data.is_correct ? "success" : "error"
      );
      await fetchAssignmentData();
    } catch (err: any) {
      const errorMsg = err.message || "提出に失敗しました";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunCode = async () => {
    if (!assignment || assignment.problem_type !== "code") return;
    setRunLoading(true);
    setError("");
    try {
      const res = await authFetch(apiEndpoints.run, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignment.id, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || "実行に失敗しました";
        throw new Error(errorMsg);
      }
      setRunResult(data);
      showSnackbar(data.all_passed ? "すべてのテストに合格しました (未提出)" : "出力を確認してください", data.all_passed ? "success" : "error");
    } catch (err: any) {
      const errorMsg = err.message || "実行に失敗しました";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
    } finally {
      setRunLoading(false);
    }
  };

  const handleSubmitChoice = async () => {
    if (!assignment || selectedChoice === null) {
      setError("選択肢を選んでください");
      showSnackbar("選択肢を選んでください", "error");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const selectedOption = choiceOptions.find((c) => c.id === selectedChoice);
      const res = await authFetch(apiEndpoints.submit, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignment.id,
          selected_choice_id: selectedChoice,
        }),
      });
      if (!res.ok) throw new Error("提出に失敗しました");
      const result = await res.json();
      showSnackbar(
        result?.is_correct ? "正解です！" : "不正解です",
        result?.is_correct ? "success" : "error"
      );
      await fetchAssignmentData();
    } catch (err: any) {
      const errorMsg = err.message || "提出に失敗しました";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEssay = async () => {
    if (!assignment || !essayText.trim()) {
      setError("答案を入力してください");
      showSnackbar("答案を入力してください", "error");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await authFetch(apiEndpoints.submit, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignment.id,
          answer_text: essayText,
        }),
      });
      if (!res.ok) throw new Error("提出に失敗しました");
      showSnackbar("答案を提出しました。採点をお待ちください。", "success");
      await fetchAssignmentData();
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
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="page-container">
        <p className="message message-error">宿題が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ backgroundColor: "#ffffff" }}>
      <PageHeader
        title={assignment.title}
        subtitle={assignment.description || ""}
        breadcrumbs={[{ label: "宿題一覧" }, { label: assignment.title }]}
      />

      {error && <div className="message message-error">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        <div className="card">
          <div className="card-title">問題文</div>
          <div style={{ fontSize: "0.95rem", lineHeight: "1.6" }}>
            <ReactMarkdown>{assignment.question_text}</ReactMarkdown>
          </div>

          {assignment.problem_type === "code" && (
            <>
              {assignment.input_example && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
                  <h4 style={{ marginBottom: "0.5rem", fontSize: "0.95rem", fontWeight: "600" }}>入力例</h4>
                  <pre style={{
                    backgroundColor: "#f9fafb",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    overflow: "auto",
                  }}>
                    {assignment.input_example}
                  </pre>
                </div>
              )}

              {assignment.expected_output && (
                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ marginBottom: "0.5rem", fontSize: "0.95rem", fontWeight: "600" }}>期待される出力</h4>
                  <pre style={{
                    backgroundColor: "#f0fdf4",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    overflow: "auto",
                  }}>
                    {assignment.expected_output}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title">答案を提出</div>

          {existingSubmission && (
            <>
              <div className={`message ${existingSubmission.is_correct === 1 ? "message-success" : existingSubmission.is_correct === 0 ? "message-error" : "message-info"}`} style={{ marginBottom: "1rem" }}>
                {existingSubmission.is_correct === 1 && (
                  <>
                    <strong>✓ 正解</strong>
                    <p>このテストケースに合格しました。</p>
                  </>
                )}
                {existingSubmission.is_correct === 0 && (
                  <>
                    <strong>✗ 不正解</strong>
                    <p>答え直してみてください。</p>
                  </>
                )}
                {existingSubmission.is_correct === null && (
                  <>
                    <strong>採点待機中</strong>
                    <p>講師による採点をお待ちください。</p>
                  </>
                )}
              </div>
              
              {existingSubmission.feedback && (
                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem", color: "#374151" }}>フィードバック</h4>
                  <div style={{ 
                    whiteSpace: "pre-wrap",
                    backgroundColor: "#f0f9ff",
                    padding: "1.25rem",
                    borderRadius: "8px",
                    border: "2px solid #bae6fd",
                    fontSize: "0.95rem",
                    lineHeight: "1.8",
                    color: "#0c4a6e",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                  }}>
                    {existingSubmission.feedback}
                  </div>
                </div>
              )}
            </>
          )}

          {assignment.problem_type === "code" && (
            <div>
              <h4 style={{ marginBottom: "0.75rem", fontSize: "0.95rem", fontWeight: "600" }}>コードを入力</h4>
              <CodeEditor value={code} onChange={setCode} height={350} />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  onClick={handleRunCode}
                  disabled={runLoading}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  {runLoading ? "実行中..." : "実行 (提出しない)"}
                </button>
                <button
                  onClick={handleSubmitCode}
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {submitting ? "提出中..." : "提出"}
                </button>
              </div>

              {runResult && (
                <div className="card" style={{ marginTop: "1rem" }}>
                  <div className="card-title">実行結果 (未提出)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {runResult.cases.map((c, idx) => (
                      <div key={idx} style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.75rem", background: "#f9fafb" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem", fontWeight: 600 }}>
                          <span>ケース {idx + 1}</span>
                          <span style={{ color: c.passed ? "#059669" : "#b91c1c" }}>
                            {c.passed ? "PASS" : "FAIL"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "#1f2937" }}>
                          <div style={{ marginBottom: "0.25rem" }}><strong>入力:</strong> {c.input || "(なし)"}</div>
                          <div style={{ marginBottom: "0.25rem" }}><strong>期待出力:</strong><pre style={{ whiteSpace: "pre-wrap", margin: 0, color: "#0f172a" }}>{c.expected_output}</pre></div>
                          <div style={{ marginBottom: "0.25rem", backgroundColor: c.passed ? "transparent" : "#fee2e2", padding: c.passed ? 0 : "0.5rem", borderRadius: c.passed ? 0 : "0.25rem" }}><strong>あなたの出力:</strong><pre style={{ whiteSpace: "pre-wrap", margin: 0, color: c.passed ? "#0f172a" : "#991b1b" }}>{c.output}</pre></div>
                          {!c.passed && c.output.includes("TypeError: unsupported operand type(s)") && c.output.includes("function") && (
                            <div style={{ 
                              marginTop: "0.5rem", 
                              padding: "0.5rem", 
                              background: "#fef2f2", 
                              borderLeft: "3px solid #ef4444", 
                              borderRadius: "4px",
                              fontSize: "0.85rem",
                              color: "#991b1b"
                            }}>
                              <strong>💡 ヒント:</strong> 関数名と引数名を混同していませんか？<br />
                              関数の中では引数名（例: <code style={{ background: "#fee2e2", padding: "2px 4px", borderRadius: "2px" }}>n</code>）を使い、関数名自体は使わないでください。
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {assignment.problem_type === "choice" && (
            <div>
              <h4 style={{ marginBottom: "0.75rem", fontSize: "0.95rem", fontWeight: "600" }}>選択肢を選んでください</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                {choiceOptions.map((option) => (
                  <label
                    key={option.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      border: `2px solid ${selectedChoice === option.id ? "#3b82f6" : "#e5e7eb"}`,
                      borderRadius: "0.5rem",
                      backgroundColor: selectedChoice === option.id ? "#e0e7ff" : "#f9fafb",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="radio"
                      name="choice"
                      value={option.id}
                      checked={selectedChoice === option.id}
                      onChange={() => setSelectedChoice(option.id)}
                      style={{ marginRight: "0.75rem", cursor: "pointer" }}
                    />
                    <span>{option.option_text}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleSubmitChoice}
                disabled={submitting || selectedChoice === null}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                {submitting ? "提出中..." : "提出"}
              </button>
            </div>
          )}

          {assignment.problem_type === "essay" && (
            <div>
              <h4 style={{ marginBottom: "0.75rem", fontSize: "0.95rem", fontWeight: "600" }}>答案を入力</h4>
              <textarea
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="答案を入力してください"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  backgroundColor: "#f8fafc",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  minHeight: "250px",
                  resize: "vertical",
                  marginBottom: "1rem",
                }}
              />
              <button
                onClick={handleSubmitEssay}
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                {submitting ? "提出中..." : "提出"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemSolve;
