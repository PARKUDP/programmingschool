import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";

interface UserItem {
  id: number;
  username: string;
  is_admin: number;
  class_names: string | null;
}

const AdminUserList: React.FC = () => {
  const { user, authFetch } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; userId: number | null; username: string }>({ isOpen: false, userId: null, username: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(apiEndpoints.users);
      const data = await res.json();
      setUsers(data || []);
      setError("");
    } catch (e: any) {
      setError("取得に失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.is_admin) return;
    load();
  }, [user]);

  const handleDelete = async (uid: number, username: string) => {
    setConfirmDialog({ isOpen: true, userId: uid, username });
  };

  const confirmDelete = async () => {
    if (!confirmDialog.userId) return;
    const uid = confirmDialog.userId;
    setConfirmDialog({ isOpen: false, userId: null, username: "" });
    try {
      const res = await authFetch(`${apiEndpoints.users}/${uid}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      setUsers((prev) => prev.filter((u) => u.id !== uid));
      setMessage("ユーザーを削除しました");
    } catch (e: any) {
      setError((e.message || "削除に失敗しました"));
    }
  };

  if (!user?.is_admin) {
    return <div className="page-container"><p className="message message-error">権限がありません</p></div>;
  }

  return (
    <div className="page-container">
      <PageHeader
        title="ユーザー一覧"
        subtitle="ユーザー削除（退会）を行えます"
        breadcrumbs={[{ label: "管理" }, { label: "ユーザー" }]}
      />
      {message && <div className="message message-success">{message}</div>}
      {error && <div className="message message-error">{error}</div>}
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <EmptyState title="ユーザーがいません" />
      ) : (
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ユーザー名</th>
              <th>権限</th>
              <th>所属クラス</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.id === user.id ? 0.6 : 1 }}>
                <td>{u.username}</td>
                <td>{u.is_admin ? "管理者" : "一般"}</td>
                <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {u.class_names || <span style={{ color: "var(--text-tertiary, #6b7280)" }}>未所属</span>}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(u.id, u.username)} 
                    disabled={u.id === user.id}
                    title={u.id === user.id ? "自分自身は削除できません" : ""}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="ユーザーを削除します"
        message={`ユーザー "${confirmDialog.username}" を削除します。この操作は取り消せません。よろしいですか？`}
        confirmText="削除"
        cancelText="キャンセル"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, userId: null, username: "" })}
      />
    </div>
  );
};

export default AdminUserList;
