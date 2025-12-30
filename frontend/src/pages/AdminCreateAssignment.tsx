import React, { useEffect, useState } from "react";
import { apiEndpoints } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useSnackbar } from "../components/SnackbarContext";

interface Lesson { id: number; title: string; material_id: number; }
interface Material { id: number; title: string; }
interface UserItem { id: number; username: string; is_admin?: number }
interface ClassItem { id: number; name: string }
interface Problem { id: number; title: string; type: string; }

const AdminCreateAssignment: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<number | "">(() => {
    const materialId = Number(new URLSearchParams(window.location.search).get("material_id"));
    return materialId ? materialId : "";
  });
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
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [targetType, setTargetType] = useState<'all'|'users'|'classes'>('all');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const titleValid = title.trim().length >= 1;
  const questionValid = questionText.trim().length >= 1;
  const lessonValid = !!lessonId;
  const [lessonTouched, setLessonTouched] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [questionTouched, setQuestionTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  useEffect(() => {
    // 教材とレッスンを並行取得
    Promise.all([
      authFetch(apiEndpoints.materials).then(res => res.json()),
      authFetch(apiEndpoints.lessons).then(res => res.json())
    ])
      .then(([matData, lessonData]) => {
        setMaterials(matData);
        setLessons(lessonData);
      })
      .catch(err => setError("データ取得失敗: " + err.message));
    // 管理用データ取得（失敗しても致命的ではないため握りつぶす）
    authFetch(apiEndpoints.users)
      .then(res => res.ok ? res.json() : [])
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
    authFetch(apiEndpoints.classes)
      .then(res => res.ok ? res.json() : [])
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [authFetch]);

  // レッスン選択時に問題を取得
  useEffect(() => {
    if (!lessonId) {
      setProblems([]);
      return;
    }
    authFetch(`/api/problems?lesson_id=${lessonId}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const probs = Array.isArray(data) ? data : data.problems || [];
        setProblems(probs);
      })
      .catch(() => setProblems([]));
  }, [lessonId, authFetch]);

  if (!user?.is_admin) return (
    <div className="page-container">
      <p className="message message-error">権限がありません</p>
    </div>
  );

  // 選択された教材のレッスンだけをフィルタリング
  const filteredLessons = selectedMaterial ? lessons.filter(l => l.material_id === selectedMaterial) : [];

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!lessonValid) { setError("レッスンを選択してください"); return; }
    if (!titleValid) { setError("タイトルを入力してください"); return; }
    if (!questionValid) { setError("問題文を入力してください"); return; }

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
      form.append("target_type", targetType === 'users' ? 'users' : targetType === 'classes' ? 'classes' : 'all');
      const ids = targetType === 'users' ? selectedUsers : targetType === 'classes' ? selectedClasses : [];
      form.append("target_ids", JSON.stringify(ids));

      const res = await authFetch(apiEndpoints.assignments, {
        method: "POST",
        body: form,
      });
      
      if (!res.ok) throw new Error("作成失敗");
      const data = await res.json();
      
      setMessage("宿題を作成しました");
      showSnackbar("宿題を作成しました", "success");
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
      setError((err.message || "作成に失敗しました"));
      showSnackbar("作成に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="宿題作成"
        subtitle="新しい宿題を作成します"
        breadcrumbs={[{ label: "管理" }, { label: "宿題" }, { label: "作成" }]}
      />

      {message && <div className="message message-success">{message}</div>}
      {error && <div className="message message-error">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* 入力フォーム */}
        <div className="card">
          <div className="card-title">宿題情報を入力</div>
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">� 教材</label>
              <select
                className="form-select"
                value={selectedMaterial}
                onChange={e => {
                  setSelectedMaterial(Number(e.target.value) || "");
                  setLessonId(""); // 教材を変更したらレッスンをリセット
                }}
                disabled={loading}
              >
                <option value="">教材を選択...</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">レッスン</label>
              <select
                className="form-select"
                value={lessonId}
                onChange={e => setLessonId(Number(e.target.value) || "")}
                onBlur={() => setLessonTouched(true)}
                disabled={loading || !selectedMaterial}
                aria-invalid={!lessonValid}
                aria-describedby="lesson-help"
              >
                <option value="">{selectedMaterial ? "レッスンを選択..." : "まず教材を選択してください"}</option>
                {filteredLessons.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
              {(!lessonValid && (lessonTouched || submitAttempted)) && (
                <div className="message message-error" style={{ marginTop: '.5rem' }}>レッスンを選択してください</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">タイトル</label>
              <input
                className="form-input"
                type="text"
                placeholder="宿題のタイトルを入力"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => setTitleTouched(true)}
                disabled={loading}
                aria-invalid={!titleValid}
                aria-describedby="title-help"
              />
              {(!titleValid && (titleTouched || submitAttempted)) && (
                <div className="message message-error" style={{ marginTop: '.5rem' }}>タイトルを入力してください</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">説明</label>
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
              <label className="form-label">問題文</label>
              <textarea
                className="form-textarea"
                placeholder="問題文を入力"
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                onBlur={() => setQuestionTouched(true)}
                disabled={loading}
                rows={3}
                aria-invalid={!questionValid}
                aria-describedby="question-help"
              />
              {(!questionValid && (questionTouched || submitAttempted)) && (
                <div className="message message-error" style={{ marginTop: '.5rem' }}>問題文を入力してください</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">入力例</label>
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
              <label className="form-label">望ましい出力</label>
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
              <label className="form-label">配布対象</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <label><input type="radio" name="target" value="all" checked={targetType==='all'} onChange={()=>setTargetType('all')} /> 全体</label>
                <label><input type="radio" name="target" value="users" checked={targetType==='users'} onChange={()=>setTargetType('users')} /> ユーザーを選択</label>
                <label><input type="radio" name="target" value="classes" checked={targetType==='classes'} onChange={()=>setTargetType('classes')} /> クラスを選択</label>
              </div>
              {targetType === 'users' && (
                <select multiple className="form-select" style={{ minHeight: 140 }}
                  value={selectedUsers.map(String)}
                  onChange={e => {
                    const opts = Array.from(e.target.selectedOptions).map(o=>Number(o.value));
                    setSelectedUsers(opts);
                  }}
                  disabled={loading}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username}{u.is_admin? ' (admin)':''}</option>
                  ))}
                </select>
              )}
              {targetType === 'classes' && (
                <select multiple className="form-select" style={{ minHeight: 140 }}
                  value={selectedClasses.map(String)}
                  onChange={e => {
                    const opts = Array.from(e.target.selectedOptions).map(o=>Number(o.value));
                    setSelectedClasses(opts);
                  }}
                  disabled={loading}
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">ファイル（オプション）</label>
              <input
                className="form-input"
                type="file"
                onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                disabled={loading}
              />
              {file && <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{file.name}</p>}
            </div>
          </div>
        </div>

        {/* プレビュー */}
        <div className="card">
          <div className="card-title">プレビュー</div>
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
                      backgroundColor: "#f9fafb",
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
                    <label style={{ fontWeight: "600", color: "var(--text-primary)" }}>入力例:</label>
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
                    <label style={{ fontWeight: "600", color: "var(--text-primary)" }}>望ましい出力:</label>
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

          {/* このレッスンの問題一覧 */}
          {lessonId && problems.length > 0 && (
            <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
              <h4 style={{ marginBottom: "1rem", fontSize: "0.95rem", fontWeight: "600" }}>このレッスンの問題</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {problems.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{p.title}</div>
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                        backgroundColor:
                          p.type === "code"
                            ? "rgba(59, 130, 246, 0.1)"
                            : p.type === "multiple_choice"
                            ? "rgba(168, 85, 247, 0.1)"
                            : "rgba(34, 197, 94, 0.1)",
                        color:
                          p.type === "code"
                            ? "#1e40af"
                            : p.type === "multiple_choice"
                            ? "#6b21a8"
                            : "#15803d",
                      }}
                    >
                      {p.type === "code"
                        ? "コード問題"
                        : p.type === "multiple_choice"
                        ? "客観式"
                        : "文章問題"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          disabled={loading || !lessonValid || !titleValid || !questionValid}
        >
          {loading ? "作成中..." : "宿題を作成"}
        </button>
      </div>
    </div>
  );
};

export default AdminCreateAssignment;
