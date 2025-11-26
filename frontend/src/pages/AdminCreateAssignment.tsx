import React, { useEffect, useState } from "react";
import { apiEndpoints } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface Lesson { id: number; title: string; }

const AdminCreateAssignment: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonId, setLessonId] = useState<number | "">(
    Number(new URLSearchParams(window.location.search).get("lesson_id")) || ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [inputExample, setInputExample] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    authFetch(apiEndpoints.lessons)
      .then(res => res.json())
      .then(data => setLessons(data))
      .catch(err => setError("レッスン取得失敗: " + err.message));
  }, [authFetch]);

  if (!user?.is_admin) return (
    <div className="page-container">
      <p className="message message-error">権限がありません</p>
    </div>
  );

  const handleSubmit = async () => {
    if (!lessonId) {
      setError("レッスンを選択してください");
      return;
    }
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (!questionText.trim()) {
      setError("問題文を入力してください");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const form = new FormData();
      form.append("lesson_id", String(lessonId));
      form.append("title", title);
      form.append("description", description);
      form.append("question_text", questionText);
      form.append("input_example", inputExample);
      form.append("expected_output", expectedOutput);
      if (file) form.append("file", file);

      const res = await authFetch(apiEndpoints.assignments, {
        method: "POST",
        body: form,
      });
      
      if (!res.ok) throw new Error("作成失敗");
      const data = await res.json();
      
      setMessage("✅ 宿題を作成しました");
      setTimeout(() => {
        navigate("/admin/assignments");
      }, 1500);
      
      setTitle("");
      setDescription("");
      setQuestionText("");
      setInputExample("");
      setExpectedOutput("");
      setLessonId("");
      setFile(null);
    } catch (err: any) {
      setError("⚠️ " + (err.message || "作成に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📝 宿題作成</h1>
        <p className="page-subtitle">新しい宿題を作成します</p>
      </div>

      {message && <div className="message message-success">{message}</div>}
      {error && <div className="message message-error">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* 入力フォーム */}
        <div className="card">
          <div className="card-title">📝 宿題情報を入力</div>
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">📚 レッスン</label>
              <select
                className="form-select"
                value={lessonId}
                onChange={e => setLessonId(Number(e.target.value) || "")}
                disabled={loading}
              >
                <option value="">レッスンを選択...</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">📌 タイトル</label>
              <input
                className="form-input"
                type="text"
                placeholder="宿題のタイトルを入力"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">📖 説明</label>
              <textarea
                className="form-textarea"
                placeholder="宿題の説明を入力"
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="form-label">❓ 問題文</label>
              <textarea
                className="form-textarea"
                placeholder="問題文を入力"
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">📥 入力例</label>
              <textarea
                className="form-textarea"
                placeholder="入力例を入力"
                value={inputExample}
                onChange={e => setInputExample(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="form-label">✅ 望ましい出力</label>
              <textarea
                className="form-textarea"
                placeholder="期待される出力結果を入力"
                value={expectedOutput}
                onChange={e => setExpectedOutput(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="form-label">📎 ファイル（オプション）</label>
              <input
                className="form-input"
                type="file"
                onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                disabled={loading}
              />
              {file && <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>📁 {file.name}</p>}
            </div>
          </div>
        </div>

        {/* プレビュー */}
        <div className="card">
          <div className="card-title">👁️ プレビュー</div>
          <div style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
            {title ? (
              <>
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)" }}>{title}</h3>
                  {description && (
                    <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {description}
                    </p>
                  )}
                </div>

                {questionText && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ fontWeight: "600", color: "var(--text-primary)" }}>問題文:</label>
                    <pre style={{
                      backgroundColor: "rgba(30, 41, 59, 0.3)",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.85rem",
                      maxHeight: "120px",
                      overflowY: "auto",
                      margin: "0.5rem 0 0 0"
                    }}>
                      {questionText}
                    </pre>
                  </div>
                )}

                {inputExample && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ fontWeight: "600", color: "var(--text-primary)" }}>📥 入力例:</label>
                    <pre style={{
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.85rem",
                      maxHeight: "100px",
                      overflowY: "auto",
                      margin: "0.5rem 0 0 0"
                    }}>
                      {inputExample}
                    </pre>
                  </div>
                )}

                {expectedOutput && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ fontWeight: "600", color: "var(--text-primary)" }}>✅ 望ましい出力:</label>
                    <pre style={{
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.85rem",
                      maxHeight: "100px",
                      overflowY: "auto",
                      margin: "0.5rem 0 0 0"
                    }}>
                      {expectedOutput}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem 0" }}>
                入力した内容がプレビューされます
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/admin/assignments")}
          disabled={loading}
        >
          キャンセル
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "作成中..." : "📝 宿題を作成"}
        </button>
      </div>
    </div>
  );
};

export default AdminCreateAssignment;
