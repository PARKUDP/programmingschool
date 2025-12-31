import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

const AdminMaterialList: React.FC = () => {
  const [materials, setMaterials] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<{ isOpen: boolean; id: number | null; title: string; description: string }>({ isOpen: false, id: null, title: "", description: "" });
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const isStaff = user?.is_admin || user?.role === "teacher";

  useEffect(() => {
    if (!isStaff) return;
    fetchMaterials();
  }, [authFetch, isStaff]);

  const fetchMaterials = async () => {
    try {
      const res = await authFetch(apiEndpoints.materials);
      const data = await res.json();
      setMaterials(data);
    } catch (err) {
      setError("教材の取得に失敗しました");
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setError("教材名を入力してください");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await authFetch(apiEndpoints.materials, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDescription }),
      });
      if (!res.ok) throw new Error("作成失敗");
      setMessage("教材を追加しました");
      setNewTitle("");
      setNewDescription("");
      await fetchMaterials();
    } catch (err: any) {
      setError((err.message || "作成に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: number, currentTitle: string, currentDescription: string | null) => {
    setEditModal({ isOpen: true, id, title: currentTitle, description: currentDescription || "" });
  };

  const handleUpdateMaterial = async () => {
    if (!editModal.id || !editModal.title.trim()) return;
    try {
      const res = await authFetch(`${apiEndpoints.materials}/${editModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editModal.title, description: editModal.description }),
      });
      if (!res.ok) throw new Error("編集失敗");
      setMessage("教材を更新しました");
      setEditModal({ isOpen: false, id: null, title: "", description: "" });
      await fetchMaterials();
    } catch (err: any) {
      setError((err.message || "編集に失敗しました"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      const res = await authFetch(`${apiEndpoints.materials}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("削除失敗");
      setMessage("教材を削除しました");
      await fetchMaterials();
    } catch (err: any) {
      setError((err.message || "削除に失敗しました"));
    }
  };

  if (!isStaff) return (
    <div className="page-container">
      <p className="message message-error">権限がありません</p>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">教材一覧</h1>
        <p className="page-subtitle">教材を管理します</p>
      </div>

      {message && <div className="message message-success">{message}</div>}
      {error && <div className="message message-error">{error}</div>}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-title">新しい教材を追加</div>
        <div className="form-section">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "1rem", alignItems: "flex-end" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">教材名</label>
              <input
                className="form-input"
                type="text"
                placeholder="教材名を入力"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">説明</label>
              <input
                className="form-input"
                type="text"
                placeholder="説明を入力"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "追加中..." : "追加"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
        {materials.length === 0 ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem" }}>
            <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>教材がありません</p>
            <p style={{ color: "var(--text-secondary)" }}>教材がありません</p>
          </div>
        ) : (
          materials.map((m: any) => (
            <div key={m.id} className="card">
              <div className="card-title">{m.title}</div>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>{m.description}</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/admin/materials/${m.id}/lessons`)}
                  style={{ flex: 1 }}
                >
                  レッスン管理
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEdit(m.id, m.title, m.description)}
                >
                  編集
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(m.id)}
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 編集モーダル */}
      {editModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', margin: 0 }}>
            <div className="card-title">教材を編集</div>
            <div className="form-group">
              <label className="form-label">教材名</label>
              <input
                className="form-input"
                value={editModal.title}
                onChange={e => setEditModal({ ...editModal, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">説明</label>
              <textarea
                className="form-textarea"
                value={editModal.description}
                onChange={e => setEditModal({ ...editModal, description: e.target.value })}
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditModal({ isOpen: false, id: null, title: "", description: "" })}>
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={handleUpdateMaterial}>
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMaterialList;
