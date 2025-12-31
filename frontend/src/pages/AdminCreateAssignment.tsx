import React, { useEffect, useState } from "react";
import { apiEndpoints } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useSnackbar } from "../components/SnackbarContext";

interface Lesson { id: number; title: string; material_id: number; }
interface Material { id: number; title: string; }
interface UserItem { id: number; username: string; is_admin?: number; role?: "student" | "teacher" | "admin" }
interface ClassItem { id: number; name: string }
interface Problem { id: number; title: string; type: string; }

const AdminCreateAssignment: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<number | "">(() => {
    const params = new URLSearchParams(window.location.search);
    const materialId = Number(params.get("material_id"));
    return materialId ? materialId : "";
  });
  const [lessonId, setLessonId] = useState<number | "">(() => {
    const params = new URLSearchParams(window.location.search);
    const lessonIdParam = Number(params.get("lesson_id"));
    return lessonIdParam ? lessonIdParam : "";
  });
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
  const [problemType, setProblemType] = useState<"choice" | "essay" | "code">("choice");
  const [choiceOptions, setChoiceOptions] = useState<string[]>(["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(0);
  const { user, authFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const isEditMode = Boolean(assignmentId);
  const [assignmentLoaded, setAssignmentLoaded] = useState(false);
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
    const isStudent = (u: UserItem) => (u.role ? u.role === "student" : !u.is_admin);
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
      .then(data => setUsers((Array.isArray(data) ? data : []).filter((u: UserItem) => isStudent(u))))
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

  // 編集時に既存データを読み込む
  useEffect(() => {
    if (!isEditMode || !assignmentId || lessons.length === 0) return;

    const load = async () => {
      try {
        const res = await authFetch(`${apiEndpoints.assignments}/${assignmentId}`);
        if (!res.ok) throw new Error("宿題の取得に失敗しました");
        const data = await res.json();
        setTitle(data.title || "");
        setDescription(data.description || "");
        setQuestionText(data.question_text || "");
        setLessonId(data.lesson_id || "");
        const lesson = lessons.find(l => l.id === data.lesson_id);
        if (lesson) setSelectedMaterial(lesson.material_id);
        setProblemType((data.problem_type as any) || "choice");
        setInputExample(data.input_example || "");
        setExpectedOutput(data.expected_output || "");

        if (data.problem_type === "choice") {
          const choicesRes = await authFetch(`${apiEndpoints.assignments}/${assignmentId}/choices`);
          if (choicesRes.ok) {
            const cdata = await choicesRes.json();
            const opts = Array.isArray(cdata) ? cdata : cdata.choices || [];
            setChoiceOptions(opts.length ? opts.map((c: any) => c.option_text) : ["", ""]);
            const correctIdx = opts.findIndex((c: any) => c.is_correct === 1);
            setCorrectAnswerIndex(correctIdx >= 0 ? correctIdx : 0);
          }
        }
        setAssignmentLoaded(true);
      } catch (err: any) {
        setError(err.message || "宿題の読み込みに失敗しました");
      }
    };

    load();
  }, [isEditMode, assignmentId, lessons, authFetch]);

  // 選択肢を削除した場合に正解インデックスが範囲外にならないよう調整
  useEffect(() => {
    if (correctAnswerIndex >= choiceOptions.length) {
      setCorrectAnswerIndex(0);
    }
  }, [correctAnswerIndex, choiceOptions.length]);

  const isStaff = user?.is_admin || user?.role === "teacher";

  if (!isStaff) return (
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

    // 選択式の場合は選択肢を検証
    if (problemType === "choice") {
      const trimmedChoices = choiceOptions.map(opt => opt.trim());
      const validChoices = trimmedChoices.filter(opt => opt.length > 0);
      if (validChoices.length < 2) {
        setError("選択肢は最低2つ以上入力してください");
        return;
      }
      if (validChoices.length !== trimmedChoices.length) {
        setError("すべての選択肢を入力してください");
        return;
      }
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isEditMode && assignmentId) {
        const payload: any = {
          lesson_id: lessonId,
          title,
          description,
          question_text: questionText,
          problem_type: problemType,
          input_example: problemType === "code" ? inputExample : undefined,
          expected_output: (problemType === "essay" || problemType === "code") ? expectedOutput : undefined,
        };

        if (problemType === "choice") {
          payload.choices = choiceOptions.map(opt => opt.trim());
          payload.correct_answer_index = correctAnswerIndex;
        }

        const res = await authFetch(`${apiEndpoints.assignments}/${assignmentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("更新に失敗しました");
        setMessage("宿題を更新しました");
        showSnackbar("宿題を更新しました", "success");
      } else {
        const form = new FormData();
        form.append("lesson_id", String(lessonId));
        form.append("title", title);
        form.append("description", description);
        form.append("question_text", questionText);
        form.append("problem_type", problemType);

        if (problemType === "choice") {
          const trimmedChoices = choiceOptions.map(opt => opt.trim());
          const normalizedIndex = Math.min(Math.max(correctAnswerIndex, 0), trimmedChoices.length - 1);
          form.append("choices", JSON.stringify(trimmedChoices));
          form.append("correct_answer_index", String(normalizedIndex));
        }

        if (problemType === "essay" || problemType === "code") {
          form.append("expected_output", expectedOutput);
        }

        if (problemType === "code") {
          form.append("input_example", inputExample);
        }

        if (file) form.append("file", file);
        form.append("target_type", targetType === 'users' ? 'users' : targetType === 'classes' ? 'classes' : 'all');
        const ids = targetType === 'users' ? selectedUsers : targetType === 'classes' ? selectedClasses : [];
        form.append("target_ids", JSON.stringify(ids));

        const res = await authFetch(apiEndpoints.assignments, {
          method: "POST",
          body: form,
        });
        
        if (!res.ok) throw new Error("作成失敗");
        setMessage("宿題を作成しました");
        showSnackbar("宿題を作成しました", "success");
        
        setTitle("");
        setDescription("");
        setQuestionText("");
        setInputExample("");
        setExpectedOutput("");
        setLessonId("");
        setFile(null);
        setProblemType("choice");
        setChoiceOptions(["", ""]);
      }

      setTimeout(() => navigate("/admin/assignments"), 800);
    } catch (err: any) {
      setError((err.message || (isEditMode ? "更新に失敗しました" : "作成に失敗しました")));
      showSnackbar(isEditMode ? "更新に失敗しました" : "作成に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title={isEditMode ? "宿題編集" : "宿題作成"}
        subtitle={isEditMode ? "既存の宿題内容を更新します" : "新しい宿題を作成します"}
        breadcrumbs={[{ label: "管理" }, { label: "宿題" }, { label: isEditMode ? "編集" : "作成" }]}
      />

      {message && <div className="message message-success">{message}</div>}
      {error && <div className="message message-error">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* 入力フォーム */}
        <div className="card">
          <div className="card-title">宿題情報を入力</div>
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">教材</label>
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

            {/* 問題タイプの選択 */}
            <div className="form-group">
              <label className="form-label">問題タイプ</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <label>
                  <input 
                    type="radio" 
                    name="problemType" 
                    value="choice" 
                    checked={problemType === "choice"}
                    onChange={() => setProblemType("choice")}
                  /> 選択式
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="problemType" 
                    value="essay" 
                    checked={problemType === "essay"}
                    onChange={() => setProblemType("essay")}
                  /> 記述式
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="problemType" 
                    value="code" 
                    checked={problemType === "code"}
                    onChange={() => setProblemType("code")}
                  /> コード実行
                </label>
              </div>
            </div>

            {/* 選択式用フォーム */}
            {problemType === "choice" && (
              <div className="form-group">
                <label className="form-label">選択肢</label>
                {choiceOptions.map((option, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={correctAnswerIndex === idx}
                      onChange={() => setCorrectAnswerIndex(idx)}
                      disabled={loading}
                    />
                    <input
                      className="form-input"
                      type="text"
                      placeholder={`選択肢 ${idx + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...choiceOptions];
                        newOptions[idx] = e.target.value;
                        setChoiceOptions(newOptions);
                      }}
                      disabled={loading}
                      style={{ flex: 1 }}
                    />
                    {choiceOptions.length > 2 && (
                      <button
                        className="btn btn-danger"
                        onClick={() => setChoiceOptions(choiceOptions.filter((_, i) => i !== idx))}
                        disabled={loading}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="btn btn-secondary"
                  onClick={() => setChoiceOptions([...choiceOptions, ""])}
                  disabled={loading}
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                >
                  + 選択肢を追加
                </button>
              </div>
            )}

            {/* 記述式用フォーム */}
            {problemType === "essay" && (
              <div className="form-group">
                <label className="form-label">期待される回答例</label>
                <textarea
                  className="form-textarea"
                  placeholder="学生が答えるべき内容の例を入力"
                  value={expectedOutput}
                  onChange={e => setExpectedOutput(e.target.value)}
                  disabled={loading}
                  rows={3}
                />
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                  ※ これは採点時の参考用です
                </p>
              </div>
            )}

            {/* コード実行用フォーム */}
            {problemType === "code" && (
              <>
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
                  <label className="form-label">期待される出力</label>
                  <textarea
                    className="form-textarea"
                    placeholder="期待される出力結果を入力"
                    value={expectedOutput}
                    onChange={e => setExpectedOutput(e.target.value)}
                    disabled={loading}
                    rows={2}
                  />
                </div>
              </>
            )}

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
                    <option key={u.id} value={u.id}>{u.username}</option>
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
                disabled={loading || isEditMode}
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
          disabled={loading || !lessonValid || !titleValid || !questionValid || (isEditMode && !assignmentLoaded)}
        >
          {loading ? (isEditMode ? "更新中..." : "作成中...") : (isEditMode ? "宿題を更新" : "宿題を作成")}
        </button>
      </div>
    </div>
  );
};

export default AdminCreateAssignment;
