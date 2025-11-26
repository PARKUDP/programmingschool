import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

interface Testcase {
  id: number;
  assignment_id: number;
  input: string;
  expected_output: string;
  comment: string;
}

const AdminCreateTestCase: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [testcases, setTestcases] = useState<Testcase[]>([]);
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { authFetch } = useAuth();

  useEffect(() => {
    fetchTestcases();
  }, [assignmentId, authFetch]);

  const fetchTestcases = async () => {
    if (!assignmentId) return;
    try {
      const res = await authFetch(`${apiEndpoints.testcases}?assignment_id=${assignmentId}`);
      const data = await res.json();
      setTestcases(
        data.map((tc: any) => ({
          ...tc,
          comment: tc.comment ?? "",
        }))
      );
    } catch (err) {
      setError("テストケースの取得に失敗しました");
    }
  };

  const handleAdd = async () => {
    if (!assignmentId) return;
    if (!input.trim() || !expected.trim()) {
      setError("入力と期待出力を入力してください");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await authFetch(apiEndpoints.testcases, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: Number(assignmentId),
          input,
          expected_output: expected,
          comment,
        }),
      });
      if (!res.ok) throw new Error("追加失敗");
      const data = await res.json();
      setTestcases((prev) => [
        ...prev,
        {
          id: data.testcase_id,
          assignment_id: Number(assignmentId),
          input,
          expected_output: expected,
          comment,
        },
      ]);
      setMessage("✅ テストケースを追加しました");
      setInput("");
      setExpected("");
      setComment("");
    } catch (err: any) {
      setError("⚠️ " + (err.message || "追加に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (tc: Testcase) => {
    try {
      const res = await authFetch(`${apiEndpoints.testcases}/${tc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: tc.input,
          expected_output: tc.expected_output,
          comment: tc.comment,
        }),
      });
      if (!res.ok) throw new Error("更新失敗");
      setMessage("✅ テストケースを更新しました");
      setTestcases((prev) =>
        prev.map((t) => (t.id === tc.id ? tc : t))
      );
    } catch (err: any) {
      setError("⚠️ " + (err.message || "更新に失敗しました"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      const res = await authFetch(`${apiEndpoints.testcases}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除失敗");
      setMessage("✅ テストケースを削除しました");
      setTestcases((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError("⚠️ " + (err.message || "削除に失敗しました"));
    }
  };

  const updateField = (
    id: number,
    field: "input" | "expected_output" | "comment",
    value: string
  ) => {
    setTestcases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🧪 テストケース管理</h1>
        <p className="page-subtitle">テストケースを追加・編集します</p>
      </div>

      {message && <div className="message message-success">{message}</div>}
      {error && <div className="message message-error">{error}</div>}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-title">新規テストケース追加</div>
        <div className="form-section">
          <div className="form-group">
            <label className="form-label">📥 入力</label>
            <textarea
              className="form-textarea"
              placeholder="テストケースの入力を入力"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label className="form-label">✅ 期待出力</label>
            <textarea
              className="form-textarea"
              placeholder="期待される出力を入力"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label className="form-label">💬 コメント（オプション）</label>
            <textarea
              className="form-textarea"
              placeholder="コメントを入力"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "追加中..." : "➕ テストケースを追加"}
          </button>
        </div>
      </div>

      <h2 className="page-subtitle" style={{ marginTop: "2rem", marginBottom: "1rem" }}>既存テストケース</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "1.5rem" }}>
        {testcases.length === 0 ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🧪</p>
            <p style={{ color: "var(--text-secondary)" }}>テストケースがありません</p>
          </div>
        ) : (
          testcases.map((tc) => (
            <div key={tc.id} className="card">
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">📥 入力</label>
                  <textarea
                    className="form-textarea"
                    value={tc.input}
                    onChange={(e) => updateField(tc.id, "input", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">✅ 期待出力</label>
                  <textarea
                    className="form-textarea"
                    value={tc.expected_output}
                    onChange={(e) => updateField(tc.id, "expected_output", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">💬 コメント</label>
                  <textarea
                    className="form-textarea"
                    value={tc.comment}
                    onChange={(e) => updateField(tc.id, "comment", e.target.value)}
                    placeholder="コメント"
                    rows={1}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleUpdate(tc)}
                    style={{ flex: 1 }}
                  >
                    更新
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(tc.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCreateTestCase;
