import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

interface Lesson {
  id: number;
  title: string;
  description: string;
}

const AdminLessonList: React.FC = () => {
  const { materialId } = useParams<{ materialId: string }>(); // material_id
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<{ isOpen: boolean; id: number | null; title: string; description: string }>({ isOpen: false, id: null, title: "", description: "" });
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  useEffect(() => {
    fetchLessons();
  }, [materialId, authFetch]);

  const fetchLessons = async () => {
    if (!materialId) return;
    try {
      const res = await authFetch(`${apiEndpoints.lessons}/by_material?material_id=${materialId}`);
      const data = await res.json();
      setLessons(data);
    } catch (err) {
      setError("レッスンの取得に失敗しました");
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (!materialId) {
      setError("教材 ID が不正です");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const matId = Number(materialId);
      if (isNaN(matId) || matId <= 0) {
        throw new Error("教材 ID が不正です");
      }
      
      const res = await authFetch(apiEndpoints.lessons, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_id: matId,
          title: newTitle,
          description,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("API Error:", res.status, errData);
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMessage("レッスンを作成しました");
      setLessons(prev => [...prev, { id: data.lesson_id, title: newTitle, description }]);
      setNewTitle("");
      setDescription("");
    } catch (err: any) {
      console.error("Create lesson error:", err);
      setError((err.message || "作成に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (lesson: Lesson) => {
    setEditModal({ isOpen: true, id: lesson.id, title: lesson.title, description: lesson.description || "" });
  };

  const handleUpdateLesson = async () => {
    if (!editModal.id || !editModal.title.trim()) return;
    try {
      const res = await authFetch(`${apiEndpoints.lessons}/${editModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material_id: Number(materialId), title: editModal.title, description: editModal.description }),
      });
      if (!res.ok) throw new Error("編集失敗");
      setMessage("レッスンを更新しました");
      setEditModal({ isOpen: false, id: null, title: "", description: "" });
      await fetchLessons();
    } catch (err: any) {
      setError((err.message || "編集に失敗しました"));
    }
  };

  const handleDelete = async (lessonId: number) => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      const res = await authFetch(`${apiEndpoints.lessons}/${lessonId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除失敗");
      setMessage("レッスンを削除しました");
      await fetchLessons();
    } catch (err: any) {
      setError((err.message || "削除に失敗しました"));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">レッスン一覧</h1>
        <p className="page-subtitle">レッスンを管理します</p>
      </div>

      {/* 戻るボタン */}
      <button
        className="btn btn-secondary"
        onClick={() => navigate("/admin/materials")}
        style={{ marginBottom: "1rem" }}
      >
        ← 教材一覧に戻る
      </button>

      {message && <div className="message message-success">{message}</div>}
      {error && <div className="message message-error">{error}</div>}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-title">新規レッスン作成</div>
        <div className="form-section">
          <div className="form-group">
            <label className="form-label">タイトル</label>
            <input
              className="form-input"
              type="text"
              placeholder="レッスンタイトルを入力"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label">説明</label>
            <textarea
              className="form-textarea"
              placeholder="レッスンの説明を入力"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "作成中..." : "レッスンを作成"}
          </button>
        </div>
      </div>

      <div className="grid">
        {lessons.length === 0 ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem" }}>
            <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>教材管理</p>
            <p style={{ color: "var(--text-secondary)" }}>レッスンがありません</p>
          </div>
        ) : (
          lessons.map(lesson => (
            <div key={lesson.id} className="card">
              <div className="card-title">{lesson.title}</div>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", minHeight: "2rem" }}>
                {lesson.description || "説明なし"}
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/admin/assignments/create?material_id=${materialId}&lesson_id=${lesson.id}`)}
                  style={{ flex: 1 }}
                >
                  宿題作成
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEdit(lesson)}
                >
                  編集
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(lesson.id)}
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
            <div className="card-title">レッスンを編集</div>
            <div className="form-group">
              <label className="form-label">タイトル</label>
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
              <button className="btn btn-primary" onClick={handleUpdateLesson}>
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLessonList;