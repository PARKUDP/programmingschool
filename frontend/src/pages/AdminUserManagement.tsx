import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { useSnackbar } from "../components/SnackbarContext";

interface ClassItem {
  id: number;
  name: string;
  description?: string;
}

interface UserItem {
  id: number;
  username: string;
  is_admin: number;
  role?: "student" | "teacher" | "admin";
  class_name?: string | null;
}

const AdminUserManagement: React.FC = () => {
  const { user, authFetch } = useAuth();
  const { showSnackbar } = useSnackbar();

  // State
  const [activeTab, setActiveTab] = useState<"users" | "classes">("users");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [members, setMembers] = useState<UserItem[]>([]);
  
  // Create class form
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  
  // Add members to class
  const [selectToAdd, setSelectToAdd] = useState<number[]>([]);
  
  // Messages
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "deleteClass" | "deleteUser" | null;
    id: number | null;
    username?: string;
  }>({ isOpen: false, type: null, id: null });

  useEffect(() => {
    if (!user?.is_admin) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, uRes] = await Promise.all([
        authFetch(apiEndpoints.classes),
        authFetch(apiEndpoints.users),
      ]);
      const [cData, uData] = await Promise.all([
        cRes.json(),
        uRes.json(),
      ]);
      
      const classesData = Array.isArray(cData) ? cData : cData.classes || [];
      const usersData = Array.isArray(uData) ? uData : uData.users || [];
      
      setClasses(classesData);
      setAllUsers(usersData);
      
      if (classesData.length && selectedClass === null && activeTab === "classes") {
        setSelectedClass(classesData[0].id);
      }
    } catch (e: any) {
      setError("データ取得に失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Load members when selected class changes
  useEffect(() => {
    if (!selectedClass) {
      setMembers([]);
      return;
    }
    authFetch(`${apiEndpoints.classes}/${selectedClass}/users`)
      .then(res => res.json())
      .then((data: UserItem[]) => setMembers(Array.isArray(data) ? data : data.users || []))
      .catch(() => setMembers([]));
  }, [selectedClass, authFetch]);

  // Non-members for adding (users not already in the selected class)
  const nonMembers = useMemo(() => {
    const memberIds = new Set(members.map(m => m.id));
    return allUsers.filter(u => 
      !memberIds.has(u.id) && 
      !u.class_name // 他のクラスに所属していない
    );
  }, [allUsers, members]);

  const handleCreateClass = async () => {
    setError("");
    setMessage("");
    
    if (!newClassName.trim()) {
      setError("クラス名を入力してください");
      return;
    }
    
    try {
      const res = await authFetch(apiEndpoints.classes, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClassName.trim(),
          description: newClassDesc,
        }),
      });
      
      if (!res.ok) throw new Error("作成に失敗しました");
      
      setNewClassName("");
      setNewClassDesc("");
      setMessage("クラスを作成しました");
      showSnackbar("クラスを作成しました", "success");
      await loadData();
    } catch (e: any) {
      setError((e.message || "作成に失敗しました"));
      showSnackbar("作成に失敗しました", "error");
    }
  };

  const handleAddMembers = async () => {
    if (!selectedClass || selectToAdd.length === 0) return;
    
    try {
      const res = await authFetch(`${apiEndpoints.classes}/${selectedClass}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: selectToAdd }),
      });
      
      if (!res.ok) throw new Error("追加に失敗しました");
      
      setSelectToAdd([]);
      setMessage("ユーザーを追加しました");
      showSnackbar("ユーザーを追加しました", "success");
      
      // メンバーリストを更新
      const mRes = await authFetch(`${apiEndpoints.classes}/${selectedClass}/users`);
      const newMembers = await mRes.json();
      setMembers(Array.isArray(newMembers) ? newMembers : newMembers.users || []);
      
      // allUsers を更新して、追加したユーザーに class_name を反映させる
      // クラス情報を取得
      const classRes = await authFetch(`${apiEndpoints.classes}/${selectedClass}`);
      const classData = await classRes.json();
      const className = classData.name;
      
      setAllUsers(allUsers.map(u => 
        selectToAdd.includes(u.id) ? { ...u, class_name: className } : u
      ));
    } catch (e: any) {
      setError((e.message || "追加に失敗しました"));
      showSnackbar("追加に失敗しました", "error");
    }
  };

  const handleRemoveMember = async (uid: number) => {
    if (!selectedClass) return;
    try {
      const res = await authFetch(`${apiEndpoints.classes}/${selectedClass}/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [uid] }),
      });
      
      if (!res.ok) throw new Error("削除に失敗しました");
      
      // メンバーリストから削除
      setMembers(members.filter(m => m.id !== uid));
      
      // allUsers を更新して、削除したユーザーの class_name を null に設定
      setAllUsers(allUsers.map(u => u.id === uid ? { ...u, class_name: null } : u));
      
      showSnackbar("メンバーを削除しました", "success");
    } catch (e: any) {
      setError(e.message || "削除に失敗しました");
      showSnackbar("削除に失敗しました", "error");
    }
  };

  const handleDeleteClass = (classId: number, className: string) => {
    setConfirmDialog({ isOpen: true, type: "deleteClass", id: classId, username: className });
  };

  const handleDeleteUser = (uid: number, username: string) => {
    if (uid === user?.id) {
      setError("自分自身は削除できません");
      return;
    }
    setConfirmDialog({ isOpen: true, type: "deleteUser", id: uid, username });
  };

  const confirmDelete = async () => {
    const { type, id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: null, id: null });
    
    if (!id) return;
    
    try {
      if (type === "deleteClass") {
        const res = await authFetch(`${apiEndpoints.classes}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("削除に失敗しました");
        setMessage("クラスを削除しました");
        setSelectedClass(null);
        await loadData();
      } else if (type === "deleteUser") {
        const res = await authFetch(`${apiEndpoints.users}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("削除に失敗しました");
        setAllUsers(prev => prev.filter(u => u.id !== id));
        setMessage("ユーザーを削除しました");
      }
      showSnackbar("削除しました", "success");
    } catch (e: any) {
      setError(e.message || "削除に失敗しました");
      showSnackbar("削除に失敗しました", "error");
    }
  };

  const getRoleLabel = (user: UserItem) => {
    if (user.role === "admin") return "管理者";
    if (user.role === "teacher") return "先生";
    return "生徒";
  };

  if (!user?.is_admin) {
    return (
      <div className="page-container">
        <p className="message message-error">権限がありません</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="ユーザー・クラス管理"
        subtitle="ユーザーとクラスを統合管理します"
        breadcrumbs={[{ label: "管理" }, { label: "ユーザー・クラス" }]}
      />

      {error && <div className="message message-error">{error}</div>}
      {message && <div className="message message-success">{message}</div>}

      {/* タブ切り替え */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", borderBottom: "2px solid var(--border)" }}>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            padding: "0.75rem 1.5rem",
            background: activeTab === "users" ? "var(--primary)" : "transparent",
            color: activeTab === "users" ? "white" : "var(--text-secondary)",
            border: "none",
            borderBottom: activeTab === "users" ? "3px solid var(--primary)" : "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "1rem",
            transition: "all 0.2s",
          }}
        >
          ユーザー一覧
        </button>
        <button
          onClick={() => setActiveTab("classes")}
          style={{
            padding: "0.75rem 1.5rem",
            background: activeTab === "classes" ? "var(--primary)" : "transparent",
            color: activeTab === "classes" ? "white" : "var(--text-secondary)",
            border: "none",
            borderBottom: activeTab === "classes" ? "3px solid var(--primary)" : "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "1rem",
            transition: "all 0.2s",
          }}
        >
          クラス管理
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      ) : activeTab === "users" ? (
        // ユーザー一覧タブ
        <div className="card">
          {allUsers.length === 0 ? (
            <EmptyState title="ユーザーがいません" />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>ユーザー名</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>ロール</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>所属クラス</th>
                  <th style={{ padding: "1rem", textAlign: "center", color: "var(--text-secondary)" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", opacity: u.id === user.id ? 0.6 : 1 }}>
                    <td style={{ padding: "1rem", fontWeight: "600" }}>{u.username}</td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "1rem",
                          fontSize: "0.85rem",
                          backgroundColor: u.role === "admin" ? "#ef4444" : u.role === "teacher" ? "#8b5cf6" : "#3b82f6",
                          color: "white",
                          display: "inline-block",
                        }}
                      >
                        {getRoleLabel(u)}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                      {u.class_name || <span style={{ color: "var(--text-tertiary, #6b7280)" }}>未所属</span>}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        disabled={u.id === user.id}
                        title={u.id === user.id ? "自分自身は削除できません" : ""}
                        style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        // クラス管理タブ
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "2rem" }}>
          {/* 左パネル: クラス一覧 */}
          <div className="card" style={{ maxHeight: "600px", overflowY: "auto" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>クラス一覧</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {classes.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>クラスがありません</p>
                ) : (
                  classes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClass(c.id)}
                      style={{
                        padding: "0.75rem 1rem",
                        backgroundColor: selectedClass === c.id ? "#3b82f6" : "#f9fafb",
                        color: selectedClass === c.id ? "white" : "var(--text-primary)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        textAlign: "left",
                        fontWeight: selectedClass === c.id ? "600" : "400",
                        transition: "all 0.2s",
                      }}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* クラス作成フォーム */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <h4 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>🆕 新規クラス</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="クラス名"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  style={{
                    padding: "0.5rem",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.25rem",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                  }}
                />
                <textarea
                  placeholder="説明（任意）"
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  style={{
                    padding: "0.5rem",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.25rem",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    minHeight: "60px",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleCreateClass}
                  style={{ fontSize: "0.9rem", padding: "0.5rem" }}
                >
                  作成
                </button>
              </div>
            </div>
          </div>

          {/* 中央・右パネル: クラス詳細 */}
          {selectedClass ? (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem" }}>{classes.find(c => c.id === selectedClass)?.name}</h3>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteClass(selectedClass, classes.find(c => c.id === selectedClass)?.name || "")}
                  style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                >
                  クラス削除
                </button>
              </div>

              {/* メンバー一覧 */}
              <div style={{ marginBottom: "2rem" }}>
                <h4 style={{ fontSize: "1rem", marginBottom: "1rem", color: "var(--text-secondary)" }}>クラスメンバー ({members.length})</h4>
                {members.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>メンバーがいません</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "0.75rem" }}>
                    {members.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: "0.75rem",
                          backgroundColor: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.5rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{m.username}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{getRoleLabel(m)}</div>
                        </div>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleRemoveMember(m.id)}
                          style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* メンバー追加 */}
              <div>
                <h4 style={{ fontSize: "1rem", marginBottom: "1rem", color: "var(--text-secondary)" }}>メンバー追加</h4>
                {nonMembers.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>追加可能なユーザーがいません</p>
                ) : (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
                      {nonMembers.map((u) => (
                        <label
                          key={u.id}
                          style={{
                            padding: "0.75rem",
                            backgroundColor: "#f9fafb",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectToAdd.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectToAdd([...selectToAdd, u.id]);
                              } else {
                                setSelectToAdd(selectToAdd.filter(id => id !== u.id));
                              }
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{u.username}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{getRoleLabel(u)}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleAddMembers}
                      disabled={selectToAdd.length === 0}
                      style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}
                    >
                      {selectToAdd.length} 件追加
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <EmptyState icon="" title="クラスを選択してください" />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.type === "deleteClass" ? "クラスを削除します" : "ユーザーを削除します"}
        message={
          confirmDialog.type === "deleteClass"
            ? `クラス「${confirmDialog.username}」を削除します。この操作は取り消せません。よろしいですか？`
            : `ユーザー「${confirmDialog.username}」を削除します。この操作は取り消せません。よろしいですか？`
        }
        confirmText="削除"
        cancelText="キャンセル"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, type: null, id: null })}
      />
    </div>
  );
};

export default AdminUserManagement;
