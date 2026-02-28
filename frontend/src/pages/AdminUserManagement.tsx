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
  name?: string | null;
  last_name?: string | null;
  first_name?: string | null;
  furigana?: string | null;
  is_admin: number;
  role?: "student" | "teacher" | "admin";
  class_name?: string | null;
}

const AdminUserManagement: React.FC = () => {
  const { user, authFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const isStaff = user?.is_admin || user?.role === "teacher";
  const canDeleteUsers = user?.is_admin;

  // State
  const [activeTab, setActiveTab] = useState<"users" | "classes">("users");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [members, setMembers] = useState<UserItem[]>([]);
  
  // 検索とページネーション
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // 固定値
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher" | "admin">("all");
  const [classFilter, setClassFilter] = useState<string>("all"); // "all" | "assigned" | "unassigned" | "class-{id}"
  
  // Create/edit class form
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editClassDesc, setEditClassDesc] = useState("");
  
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

  // User edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    last_name: "",
    first_name: "",
    furigana: "",
    role: "student" as "student" | "teacher" | "admin",
    password: "",
  });

  useEffect(() => {
    if (!isStaff) return;
    loadData();
  }, [isStaff]);

  // reflect selected class into edit fields
  useEffect(() => {
    if (!selectedClass) {
      setEditClassName("");
      setEditClassDesc("");
      return;
    }
    const found = classes.find(c => c.id === selectedClass);
    setEditClassName(found?.name || "");
    setEditClassDesc(found?.description || "");
  }, [selectedClass, classes]);

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
    if (!isStaff || !selectedClass) {
      setMembers([]);
      return;
    }
    const isStudent = (u: UserItem) => (u.role ? u.role === "student" : !u.is_admin);
    authFetch(`${apiEndpoints.classes}/${selectedClass}/users`)
      .then(res => res.json())
      .then((data: UserItem[]) => setMembers((Array.isArray(data) ? data : data.users || []).filter((u: UserItem) => isStudent(u))))
      .catch(() => setMembers([]));
  }, [selectedClass, authFetch, isStaff]);

  // Non-members for adding (users not already in the selected class)
  const nonMembers = useMemo(() => {
    const memberIds = new Set(members.map(m => m.id));
    const isStudent = (u: UserItem) => (u.role ? u.role === "student" : !u.is_admin);
    return allUsers.filter(u => 
      isStudent(u) &&
      !memberIds.has(u.id) && 
      !u.class_name // 他のクラスに所属していない
    );
  }, [allUsers, members]);

  // フィルタリングとページネーション
  const filteredUsers = useMemo(() => {
    let filtered = allUsers;
    
    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.username.toLowerCase().includes(query) ||
        (u.last_name && u.last_name.toLowerCase().includes(query)) ||
        (u.first_name && u.first_name.toLowerCase().includes(query)) ||
        (u.furigana && u.furigana.toLowerCase().includes(query)) ||
        (u.class_name && u.class_name.toLowerCase().includes(query))
      );
    }
    
    // ロールフィルタ
    if (roleFilter !== "all") {
      filtered = filtered.filter(u => (u.role || "student") === roleFilter);
    }
    
    // クラス所属フィルタ
    if (classFilter === "assigned") {
      filtered = filtered.filter(u => u.class_name);
    } else if (classFilter === "unassigned") {
      filtered = filtered.filter(u => !u.class_name);
    } else if (classFilter.startsWith("class-")) {
      // 特定のクラスIDで絞り込み
      const classId = parseInt(classFilter.replace("class-", ""));
      const targetClass = classes.find(c => c.id === classId);
      if (targetClass) {
        filtered = filtered.filter(u => u.class_name === targetClass.name);
      }
    }
    
    return filtered;
  }, [allUsers, searchQuery, roleFilter, classFilter, classes]);

  // ページネーション計算
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // ページ変更時に現在のページをリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, classFilter]);

  // ユーザー編集ダイアログを開く
  const handleOpenEditDialog = (u: UserItem) => {
    // 先生は生徒のみ編集可能
    const isTeacher = user?.role === "teacher" && !user?.is_admin;
    if (isTeacher) {
      const targetRole = u.role || (u.is_admin ? "admin" : "student");
      if (targetRole !== "student") {
        showSnackbar("先生は生徒のみ編集できます", "error");
        return;
      }
    }
    
    setEditingUser(u);
    setEditFormData({
      last_name: u.last_name || "",
      first_name: u.first_name || "",
      furigana: u.furigana || "",
      role: (u.role || "student") as "student" | "teacher" | "admin",
      password: "",
    });
    setEditDialogOpen(true);
  };

  // ユーザー編集を保存
  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    
    setError("");
    setMessage("");

    try {
      const res = await authFetch(`${apiEndpoints.users}/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_name: editFormData.last_name,
          first_name: editFormData.first_name,
          furigana: editFormData.furigana,
          role: editFormData.role,
          ...(editFormData.password && { password: editFormData.password }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ユーザー情報の更新に失敗しました");
      }

      setMessage("ユーザー情報を更新しました");
      setEditDialogOpen(false);
      loadData(); // データを再読み込み
      showSnackbar("ユーザー情報を更新しました", "success");
    } catch (e: any) {
      setError(e.message);
      showSnackbar(e.message, "error");
    }
  };

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

  const handleUpdateClass = async () => {
    if (!selectedClass) return;
    if (!editClassName.trim()) { setError("クラス名を入力してください"); return; }
    try {
      const res = await authFetch(`${apiEndpoints.classes}/${selectedClass}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editClassName.trim(), description: editClassDesc }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      setMessage("クラスを更新しました");
      showSnackbar("クラスを更新しました", "success");
      const current = selectedClass;
      await loadData();
      if (current) setSelectedClass(current);
    } catch (e: any) {
      setError(e.message || "更新に失敗しました");
      showSnackbar("更新に失敗しました", "error");
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
      const className = classes.find(c => c.id === selectedClass)?.name || "";
      
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
    if (!canDeleteUsers) {
      setError("ユーザー削除は管理者のみ可能です");
      showSnackbar("ユーザー削除は管理者のみ可能です", "error");
      return;
    }
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
        if (!canDeleteUsers) {
          setError("ユーザー削除は管理者のみ可能です");
          showSnackbar("ユーザー削除は管理者のみ可能です", "error");
          return;
        }
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
          {/* 検索とフィルタ */}
          <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
              {/* 検索バー */}
              <div className="form-group" style={{ margin: 0 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 ユーザー名、氏名、ふりがな、クラスで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              
              {/* ロールフィルタ */}
              <div className="form-group" style={{ margin: 0 }}>
                <select 
                  className="form-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                >
                  <option value="all">すべてのロール</option>
                  <option value="student">生徒のみ</option>
                  <option value="teacher">先生のみ</option>
                  <option value="admin">管理者のみ</option>
                </select>
              </div>
              
              {/* クラスフィルタ */}
              <div className="form-group" style={{ margin: 0 }}>
                <select 
                  className="form-select"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value as any)}
                >
                  <option value="all">すべて</option>
                  <option value="assigned">クラス所属のみ</option>
                  <option value="unassigned">未所属のみ</option>
                  {classes.length > 0 && <option disabled>──────</option>}
                  {classes.map(c => (
                    <option key={c.id} value={`class-${c.id}`}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 検索結果の件数表示 */}
            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              {filteredUsers.length === allUsers.length ? (
                `全 ${allUsers.length} 件のユーザー`
              ) : (
                `${filteredUsers.length} 件が見つかりました（全 ${allUsers.length} 件中）`
              )}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState title={searchQuery ? "該当するユーザーが見つかりません" : "ユーザーがいません"} />
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>氏名</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>ふりがな</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>ユーザー名</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>ロール</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>所属クラス</th>
                  <th style={{ padding: "1rem", textAlign: "center", color: "var(--text-secondary)" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", opacity: u.id === user.id ? 0.6 : 1 }}>
                    <td style={{ padding: "1rem", fontWeight: "600" }}>
                      {u.last_name || u.first_name ? (
                        <>{u.last_name} {u.first_name}</>
                      ) : (
                        <span style={{ color: "var(--text-tertiary, #6b7280)" }}>(未設定)</span>
                      )}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                      {u.furigana || <span style={{ color: "var(--text-tertiary, #6b7280)" }}>未設定</span>}
                    </td>
                    <td style={{ padding: "1rem" }}>{u.username}</td>
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
                      {(() => {
                        const isTeacher = user?.role === "teacher" && !user?.is_admin;
                        const targetRole = u.role || (u.is_admin ? "admin" : "student");
                        const canEdit = !isTeacher || targetRole === "student";
                        
                        return (
                          <>
                            <button
                              className="btn btn-primary"
                              onClick={() => handleOpenEditDialog(u)}
                              disabled={!canEdit}
                              title={!canEdit ? "先生は生徒のみ編集できます" : ""}
                              style={{ fontSize: "0.85rem", padding: "0.4rem 1rem", marginRight: "0.5rem" }}
                            >
                              編集
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={u.id === user.id || !canDeleteUsers}
                              title={
                                !canDeleteUsers
                                  ? "ユーザー削除は管理者のみ可能です"
                                  : u.id === user.id
                                    ? "自分自身は削除できません"
                                    : ""
                              }
                              style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                            >
                              削除
                            </button>
                          </>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* ページネーション */}
            {totalPages > 1 && (
              <div style={{ 
                marginTop: "1.5rem", 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                gap: "0.5rem",
                flexWrap: "wrap"
              }}>
                <button
                  className="btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{ padding: "0.5rem 1rem" }}
                >
                  ≪
                </button>
                <button
                  className="btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: "0.5rem 1rem" }}
                >
                  ‹
                </button>
                
                {/* ページ番号ボタン */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={currentPage === pageNum ? "btn btn-primary" : "btn"}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{ padding: "0.5rem 1rem", minWidth: "2.5rem" }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  className="btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: "0.5rem 1rem" }}
                >
                  ›
                </button>
                <button
                  className="btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{ padding: "0.5rem 1rem" }}
                >
                  ≫
                </button>
                
                <span style={{ marginLeft: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {currentPage} / {totalPages} ページ
                </span>
              </div>
            )}
            </>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", marginBottom: "1.25rem" }}>
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label className="form-label">クラス名</label>
                    <input
                      className="form-input"
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value)}
                      placeholder="クラス名"
                    />
                  </div>
                  <div>
                    <label className="form-label">説明（任意）</label>
                    <input
                      className="form-input"
                      value={editClassDesc}
                      onChange={(e) => setEditClassDesc(e.target.value)}
                      placeholder="説明を入力"
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleUpdateClass}
                    style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem", whiteSpace: "nowrap" }}
                  >
                    更新
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteClass(selectedClass, classes.find(c => c.id === selectedClass)?.name || "")}
                    style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem", whiteSpace: "nowrap" }}
                  >
                    クラス削除
                  </button>
                </div>
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
                          <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                            {m.last_name || m.first_name ? (
                              <>{m.last_name} {m.first_name}</>
                            ) : (
                              <span style={{ color: "var(--text-tertiary, #6b7280)" }}>(未設定)</span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{m.username}</div>
                          {m.furigana && (
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{m.furigana}</div>
                          )}
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
                            <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                              {u.last_name || u.first_name ? (
                                <>{u.last_name} {u.first_name}</>
                              ) : (
                                <span style={{ color: "var(--text-tertiary, #6b7280)" }}>(未設定)</span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{u.username}</div>
                            {u.furigana && (
                              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{u.furigana}</div>
                            )}
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

      {/* ユーザー編集ダイアログ */}
      {editDialogOpen && editingUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setEditDialogOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "2rem",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: "1.5rem", color: "var(--text-primary)" }}>
              ユーザー編集: {editingUser.username}
            </h2>

            {error && (
              <div
                style={{
                  backgroundColor: "#fee",
                  color: "#c00",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveUserEdit();
              }}
              style={{ display: "grid", gap: "1rem" }}
            >
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                  姓
                </label>
                <input
                  type="text"
                  value={editFormData.last_name}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  placeholder="山田"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "1rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                  名
                </label>
                <input
                  type="text"
                  value={editFormData.first_name}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  placeholder="太郎"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "1rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                  ふりがな
                </label>
                <input
                  type="text"
                  value={editFormData.furigana}
                  onChange={(e) => setEditFormData({ ...editFormData, furigana: e.target.value })}
                  placeholder="やまだたろう"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "1rem",
                  }}
                />
              </div>

              {user?.is_admin && editingUser.id !== user.id && (
                <>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                      ロール
                    </label>
                    <select
                      value={editFormData.role}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          role: e.target.value as "student" | "teacher" | "admin",
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "1rem",
                      }}
                    >
                      <option value="student">生徒</option>
                      <option value="teacher">先生</option>
                      <option value="admin">管理者</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                      新しいパスワード (空白で変更なし)
                    </label>
                    <input
                      type="password"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="パスワード"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "1rem",
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setEditDialogOpen(false)}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "1rem",
                  }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
