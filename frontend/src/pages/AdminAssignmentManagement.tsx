import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import PageHeader from "../components/PageHeader";
import { useSnackbar } from "../components/SnackbarContext";

interface Assignment {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  created_at: string;
}

interface ClassItem {
  id: number;
  name: string;
}

interface UserItem {
  id: number;
  username: string;
  last_name?: string | null;
  first_name?: string | null;
  furigana?: string | null;
  name?: string | null;
  role?: "student" | "teacher" | "admin";
  is_admin?: number;
}

interface Target {
  target_type: string;
  target_id: number | null;
}

const AdminAssignmentManagement: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user, authFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const isStaff = user?.is_admin || user?.role === "teacher";
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [targetType, setTargetType] = useState<"none" | "all" | "users" | "classes">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isStaff || !assignmentId) return;
    loadData();
  }, [isStaff, assignmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, cRes, uRes, tRes] = await Promise.all([
        authFetch(`${apiEndpoints.assignments}`),
        authFetch(apiEndpoints.classes),
        authFetch(apiEndpoints.users),
        authFetch(`${apiEndpoints.assignments}/${assignmentId}/targets`),
      ]);
      const [aData, cData, uData, tData] = await Promise.all([
        aRes.json(),
        cRes.json(),
        uRes.json(),
        tRes.json(),
      ]);
      
      const isStudent = (u: UserItem) => (u.role ? u.role === "student" : !u.is_admin);

      const foundAssignment = (aData || []).find((a: Assignment) => a.id === Number(assignmentId));
      setAssignment(foundAssignment || null);
      setClasses(cData || []);
      setUsers((uData || []).filter((u: UserItem) => isStudent(u)));
      
      const targets: Target[] = tData.targets || [];
      console.log('API Response - targets:', targets, 'tData:', tData);
      if (targets.length === 0) {
        // 割り当てがない場合
        console.log('Setting targetType to none because targets is empty');
        setTargetType("none");
        setSelectedIds([]);
      } else if (targets[0].target_type === "all") {
        console.log('Setting targetType to all');
        setTargetType("all");
        setSelectedIds([]);
      } else if (targets[0].target_type === "user") {
        console.log('Setting targetType to users with ids:', targets.map((t) => t.target_id));
        setTargetType("users");
        setSelectedIds(targets.map((t) => t.target_id!).filter((id) => id !== null));
      } else if (targets[0].target_type === "class") {
        console.log('Setting targetType to classes with ids:', targets.map((t) => t.target_id));
        setTargetType("classes");
        setSelectedIds(targets.map((t) => t.target_id!).filter((id) => id !== null));
      }
    } catch (e: any) {
      setError("データ取得に失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTargets = async () => {
    if (!assignmentId) return;
    try {
      const payload = {
        target_type: targetType,
        target_ids: targetType === "all" ? [] : selectedIds,
      };
      console.log('Sending PUT request with payload:', payload, 'assignmentId:', assignmentId);
      const res = await authFetch(`${apiEndpoints.assignments}/${assignmentId}/targets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log('PUT response status:', res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Update failed: ${res.status} - ${errorData.error || 'Unknown error'}`);
      }
      showSnackbar("割り当て先を更新しました", "success");
      navigate("/admin/assignments");
    } catch (e: any) {
      console.error('Update error:', e);
      setError((e.message || "更新に失敗しました"));
      showSnackbar("更新に失敗しました", "error");
    }
  };

  // ユーザーの表示名を生成
  const getUserDisplayName = (u: UserItem) => {
    if (u.last_name || u.first_name) {
      const name = `${u.last_name || ""} ${u.first_name || ""}`.trim();
      if (u.furigana) {
        return `${name} (${u.furigana})`;
      }
      return name;
    }
    return u.username;
  };


  if (!isStaff) {
    return (
      <div className="page-container">
        <p className="message message-error">権限がありません</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="page-container">
        <p className="message message-error">宿題が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="宿題割り当て管理"
        subtitle={`「${assignment.title}」の割り当て先を設定します`}
        breadcrumbs={[{ label: "管理" }, { label: "宿題", to: "/admin/assignments" }, { label: "割り当て" }]}
      />

      {error && <div className="message message-error">{error}</div>}

      <div className="card">
        <div className="card-title">割り当て先の設定</div>
        <div className="form-section">
          <div className="form-group">
            <label className="form-label">割り当て対象</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
              gap: '1rem', 
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '0.5rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="targetType" 
                  value="none" 
                  checked={targetType === "none"}
                  onChange={(e) => {
                    setTargetType(e.target.value as "none" | "all" | "users" | "classes");
                    setSelectedIds([]);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span>割り当てなし</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="targetType" 
                  value="all" 
                  checked={targetType === "all"}
                  onChange={(e) => {
                    setTargetType(e.target.value as "none" | "all" | "users" | "classes");
                    setSelectedIds([]);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span>全員</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="targetType" 
                  value="users" 
                  checked={targetType === "users"}
                  onChange={(e) => {
                    setTargetType(e.target.value as "none" | "all" | "users" | "classes");
                    setSelectedIds([]);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span>特定のユーザー</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="targetType" 
                  value="classes" 
                  checked={targetType === "classes"}
                  onChange={(e) => {
                    setTargetType(e.target.value as "none" | "all" | "users" | "classes");
                    setSelectedIds([]);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span>特定のクラス</span>
              </label>
            </div>
          </div>

          {targetType === "users" && (
            <div className="form-group">
              <label className="form-label">ユーザーを選択（複数選択可）</label>
              
              {/* 選択済みユーザーのバッジ表示 */}
              {selectedIds.length > 0 && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "0.5rem"
                }}>
                  {selectedIds.map(id => {
                    const user = users.find(u => u.id === id);
                    return user ? (
                      <div
                        key={id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "#ec4899",
                          color: "white",
                          borderRadius: "2rem",
                          fontSize: "0.9rem",
                          fontWeight: "500"
                        }}
                      >
                        <span>{getUserDisplayName(user)}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* チェックボックスリスト */}
              <div style={{
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                backgroundColor: "#f9fafb",
                maxHeight: "300px",
                overflowY: "auto"
              }}>
                {users.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", margin: 0, padding: "0.5rem" }}>
                    利用可能なユーザーはありません
                  </p>
                ) : (
                  users.map((u) => (
                    <label
                      key={u.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.5rem",
                        cursor: "pointer",
                        borderRadius: "0.25rem",
                        transition: "background-color 0.2s",
                        backgroundColor: selectedIds.includes(u.id) ? "#dbeafe" : "transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedIds.includes(u.id)) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedIds.includes(u.id)) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, u.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== u.id));
                          }
                        }}
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                          accentColor: "var(--primary)"
                        }}
                      />
                      <span style={{ fontSize: "0.95rem", userSelect: "none" }}>
                        {getUserDisplayName(u)}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <span className="help-text" style={{ marginTop: "0.5rem", display: "block" }}>
                ユーザー名をクリックして選択/選択解除
              </span>
            </div>
          )}

          {targetType === "classes" && (
            <div className="form-group">
              <label className="form-label">クラスを選択（複数選択可）</label>
              
              {/* 選択済みクラスのバッジ表示 */}
              {selectedIds.length > 0 && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "0.5rem"
                }}>
                  {selectedIds.map(id => {
                    const cls = classes.find(c => c.id === id);
                    return cls ? (
                      <div
                        key={id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "#3b82f6",
                          color: "white",
                          borderRadius: "2rem",
                          fontSize: "0.9rem",
                          fontWeight: "500"
                        }}
                      >
                        <span>{cls.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* チェックボックスリスト */}
              <div style={{
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                backgroundColor: "#f9fafb",
                maxHeight: "300px",
                overflowY: "auto"
              }}>
                {classes.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", margin: 0, padding: "0.5rem" }}>
                    利用可能なクラスはありません
                  </p>
                ) : (
                  classes.map((c) => (
                    <label
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.5rem",
                        cursor: "pointer",
                        borderRadius: "0.25rem",
                        transition: "background-color 0.2s",
                        backgroundColor: selectedIds.includes(c.id) ? "#dbeafe" : "transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedIds.includes(c.id)) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedIds.includes(c.id)) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, c.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== c.id));
                          }
                        }}
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                          accentColor: "var(--primary)"
                        }}
                      />
                      <span style={{ fontSize: "0.95rem", userSelect: "none" }}>
                        {c.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <span className="help-text" style={{ marginTop: "0.5rem", display: "block" }}>
                クラス名をクリックして選択/選択解除
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/admin/assignments")}
            >
              キャンセル
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpdateTargets}
              style={{ flex: 1 }}
            >
              割り当てを更新
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAssignmentManagement;
