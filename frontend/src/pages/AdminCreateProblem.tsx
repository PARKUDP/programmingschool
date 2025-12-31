import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useSnackbar } from "../components/SnackbarContext";

type Lesson = {
  id: number;
  title: string;
  material_id: number;
};

type ProblemType = "code" | "multiple_choice" | "essay";

interface Choice {
  text: string;
  isCorrect: boolean;
}

const AdminCreateProblem = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [type, setType] = useState<ProblemType>("code");
  const [choices, setChoices] = useState<Choice[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { authFetch, user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isStaff = user?.is_admin || user?.role === "teacher";

  useEffect(() => {
    if (!isStaff) return;
    // URLパラメータからレッスンIDを取得
    const lessonIdFromUrl = Number(searchParams.get("lesson_id"));
    if (lessonIdFromUrl) {
      setSelectedLessonId(lessonIdFromUrl);
    }

    authFetch(apiEndpoints.lessons)
      .then((res) => res.json())
      .then((data) => setLessons(Array.isArray(data) ? data : data.lessons || []))
      .catch((err) => {
        setError("レッスン取得失敗: " + err.message);
        showSnackbar("レッスン取得失敗", "error");
      });
  }, [authFetch, searchParams, showSnackbar, isStaff]);

  const handleAddChoice = () => {
    setChoices([...choices, { text: "", isCorrect: false }]);
  };

  const handleRemoveChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const handleChoiceChange = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
    const newChoices = [...choices];
    if (field === "text") {
      newChoices[index].text = value as string;
    } else {
      newChoices[index].isCorrect = value as boolean;
    }
    setChoices(newChoices);
  };

  const validateForm = () => {
    if (!selectedLessonId) {
      setError("レッスンを選択してください");
      return false;
    }
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return false;
    }
    if (!markdown.trim()) {
      setError("問題文を入力してください");
      return false;
    }
    if (type === "multiple_choice") {
      if (choices.some((c) => !c.text.trim())) {
        setError("すべての選択肢を入力してください");
        return false;
      }
      if (!choices.some((c) => c.isCorrect)) {
        setError("正解を選択してください");
        return false;
      }
    }
    return true;
  };

  const handleCreateProblem = async () => {
    setError("");
    setMessage("");

    if (!validateForm()) {
      showSnackbar(error, "error");
      return;
    }

    setLoading(true);

    try {
      // 問題を作成
      const problemRes = await authFetch(apiEndpoints.problems, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: selectedLessonId,
          title: title.trim(),
          markdown: markdown.trim(),
          type,
        }),
      });

      if (!problemRes.ok) {
        const errData = await problemRes.json();
        throw new Error(errData.error || "問題作成失敗");
      }

      const problemData = await problemRes.json();
      const problemId = problemData.problem_id;

      // 客観式問題の場合、選択肢を登録
      if (type === "multiple_choice" && choices.length > 0) {
        const choicesRes = await authFetch(`/api/problems/${problemId}/choices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            choices: choices.map((c, idx) => ({
              text: c.text,
              is_correct: c.isCorrect ? 1 : 0,
              display_order: idx,
            })),
          }),
        });

        if (!choicesRes.ok) {
          throw new Error("選択肢の登録に失敗しました");
        }
      }

      setMessage("問題を作成しました");
      showSnackbar("問題を作成しました", "success");

      // フォームリセット
      setTitle("");
      setMarkdown("");
      setType("code");
      setChoices([
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
      setSelectedLessonId(null);

      // 1.5秒後にレッスン詳細ページへリダイレクト
      setTimeout(() => {
        if (selectedLessonId) {
          navigate(`/admin/lessons/${selectedLessonId}`);
        }
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.message || "エラーが発生しました";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="page-container">
        <p className="message message-error">権限がありません</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="問題作成"
        subtitle="新しい問題を作成します"
        breadcrumbs={[{ label: "管理" }, { label: "問題作成" }]}
      />

      <div style={{ maxWidth: "700px" }}>
        {error && <div className="message message-error">{error}</div>}
        {message && <div className="message message-success">{message}</div>}

        <div className="card" style={{ padding: "2rem" }}>
          {/* レッスン選択 */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
              レッスン <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={selectedLessonId || ""}
              onChange={(e) => setSelectedLessonId(Number(e.target.value) || null)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid #e0e7ff",
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              <option value="">レッスンを選択してください</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
          </div>

          {/* 問題タイプ選択 */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
              問題タイプ <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              {(["code", "multiple_choice", "essay"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: "0.75rem 1rem",
                    border: `2px solid ${type === t ? "#3b82f6" : "#d1d5db"}`,
                    backgroundColor: type === t ? "#e0e7ff" : "white",
                    color: type === t ? "#3b82f6" : "var(--text-secondary)",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {t === "code"
                    ? "コード問題"
                    : t === "multiple_choice"
                    ? "客観式"
                    : "文章問題"}
                </button>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
              タイトル <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="問題のタイトルを入力"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid #e0e7ff",
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
                fontSize: "1rem",
              }}
            />
          </div>

          {/* 問題文 */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
              問題文（Markdown形式） <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="問題文を入力してください。Markdownに対応しています。"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid #e0e7ff",
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
                fontSize: "1rem",
                fontFamily: "monospace",
                minHeight: "150px",
                resize: "vertical",
              }}
            />
          </div>

          {/* 客観式問題の選択肢 */}
          {type === "multiple_choice" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.75rem" }}>
                選択肢 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {choices.map((choice, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={choice.text}
                        onChange={(e) => handleChoiceChange(idx, "text", e.target.value)}
                        placeholder={`選択肢 ${idx + 1}`}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "2px solid #e0e7ff",
                          borderRadius: "0.5rem",
                          backgroundColor: "#f8fafc",
                          fontSize: "1rem",
                        }}
                      />
                    </div>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontWeight: "500",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <input
                        type="radio"
                        name="correct-choice"
                        checked={choice.isCorrect}
                        onChange={() =>
                          setChoices(
                            choices.map((c, i) => ({
                              ...c,
                              isCorrect: i === idx,
                            }))
                          )
                        }
                        style={{ cursor: "pointer" }}
                      />
                      正解
                    </label>
                    <button
                      onClick={() => handleRemoveChoice(idx)}
                      disabled={choices.length <= 2}
                      style={{
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "0.25rem",
                        cursor: choices.length > 2 ? "pointer" : "not-allowed",
                        fontWeight: "500",
                        opacity: choices.length > 2 ? 1 : 0.5,
                      }}
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddChoice}
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "#dbeafe",
                    color: "#1e40af",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  + 選択肢を追加
                </button>
              </div>
            </div>
          )}

          {/* 送信ボタン */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => navigate(-1)}
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
              onClick={handleCreateProblem}
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: "0.75rem 1.5rem",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "作成中..." : "作成"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCreateProblem;
