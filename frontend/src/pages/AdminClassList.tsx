import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useSnackbar } from "../components/SnackbarContext";

interface ClassItem { id: number; name: string; description?: string }
interface UserItem { id: number; username: string; is_admin?: number }

const AdminClassList: React.FC = () => {
  const { user, authFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [members, setMembers] = useState<UserItem[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [selectToAdd, setSelectToAdd] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; classId: number | null }>({ isOpen: false, classId: null });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.is_admin) return;
    refresh();
  }, [user]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [cRes, uRes] = await Promise.all([
        authFetch(apiEndpoints.classes),
        authFetch(apiEndpoints.users),
      ]);
      const [cData, uData] = await Promise.all([cRes.json(), uRes.json()]);
      setClasses(cData || []);
      setUsers(uData || []);
      if (cData?.length && selectedClass === null) {
        setSelectedClass(cData[0].id);
      }
    } catch (e: any) {
      setError("データ取得に失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClass) { setMembers([]); return; }
    authFetch(`${apiEndpoints.classes}/${selectedClass}/users`)
      .then(res => res.json())
      .then((data: UserItem[]) => setMembers(data || []))
      .catch(() => setMembers([]));
  }, [selectedClass]);

  const handleCreateClass = async () => {
    setError(""); setMessage("");
    if (!newClassName.trim()) { setError("クラス名を入力してください"); return; }
    try {
      const res = await authFetch(apiEndpoints.classes, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName.trim(), description: newClassDesc })
      });
      if (!res.ok) throw new Error("作成に失敗しました");
      setNewClassName(""); setNewClassDesc("");
      setMessage("クラスを作成しました");
      showSnackbar("クラスを作成しました", "success");
      await refresh();
    } catch (e: any) {
      setError((e.message || "作成に失敗しました"));
      showSnackbar("作成に失敗しました", "error");
    }
  };

  const nonMembers = useMemo(() => {
    const memberIds = new Set(members.map(m => m.id));
    return users.filter(u => !memberIds.has(u.id));
  }, [users, members]);

  const addMembers = async () => {
    if (!selectedClass || selectToAdd.length === 0) return;
    try {
      const res = await authFetch(`${apiEndpoints.classes}/${selectedClass}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: selectToAdd })
      });
      if (!res.ok) throw new Error("追加に失敗しました");
      setSelectToAdd([]);
      setMessage("ユーザーを追加しました");
      showSnackbar("ユーザーを追加しました", "success");
      // refresh members
      const mRes = await authFetch(`${apiEndpoints.classes}/${selectedClass}/users`);
      setMembers(await mRes.json());
    } catch (e: any) {
      setError((e.message || "追加に失敗しました"));
      showSnackbar("追加に失敗しました", "error");
    }
  };

  const removeMember = async (uid: number) => {
    if (!selectedClass) return;
    try {
      const res = await authFetch(`${apiEndpoints.classes}/${selectedClass}/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [uid] })
      });
      if (!res.ok) throw new Error("削除に失敗しました");
      setMembers(members.filter(m => m.id !== uid));
      showSnackbar("メンバーを削除しました", "success");
    } catch (e: any) {
      setError(e.message || "削除に失敗しました");
      showSnackbar("削除に失敗しました", "error");
    }
  };

  const deleteClass = async (classId: number) => {
    setConfirmDialog({ isOpen: true, classId });
  };

  const confirmDeleteClass = async () => {
    if (!confirmDialog.classId) return;
    setConfirmDialog({ isOpen: false, classId: null });
    try {
      const res = await authFetch(`${apiEndpoints.classes}/${confirmDialog.classId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("削除に失敗しました");
      setMessage("クラスを削除しました");
      showSnackbar("クラスを削除しました", "success");
      setSelectedClass(null);
      await refresh();
    } catch (e: any) {
      setError(e.message || "削除に失敗しました");
      showSnackbar("削除に失敗しました", "error");
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newClasses = [...classes];
    const draggedItem = newClasses[draggedIndex];
    newClasses.splice(draggedIndex, 1);
    newClasses.splice(index, 0, draggedItem);
    
    setClasses(newClasses);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    setDraggedIndex(null);
    
    // 順序を保存
    try {
      const order = classes.map(c => c.id);
      await authFetch(`${apiEndpoints.classes}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
    } catch (e: any) {
      console.error('順序の保存に失敗しました:', e);
      showSnackbar('順序の保存に失敗しました', 'error');
    }
  };

  if (!user?.is_admin) {
    return <div className="page-container"><p className="message message-error">権限がありません</p></div>;
  }

  return (
    <div className="page-container">
      <PageHeader
        title="クラス管理"
        subtitle="クラスの作成とメンバー管理"
        breadcrumbs={[{ label: "管理" }, { label: "クラス" }]}
      />
      {message && <div className="message message-success">{message}</div>}
      {error && <div className="message message-error">{error}</div>}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-title">クラス一覧</div>
            <LoadingSkeleton lines={6} />
          </div>
          <div className="card">
            <div className="card-title">メンバー管理</div>
            <LoadingSkeleton lines={8} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-title">クラス一覧</div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                {classes.length === 0 ? (
                  <EmptyState icon="" title="クラスがありません" />
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {classes.map((c, index) => (
                      <li 
                        key={c.id} 
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        style={{ 
                          marginBottom: '0.5rem', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          cursor: 'move',
                          opacity: draggedIndex === index ? 0.5 : 1,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        <button 
                          className={`btn ${selectedClass===c.id? 'btn-primary':'btn-secondary'}`} 
                          onClick={() => setSelectedClass(c.id)}
                          style={{ flex: 1, textAlign: 'left', cursor: 'pointer' }}
                        >
                          ☰ {c.name}
                        </button>
                        <button className="btn btn-danger" style={{ fontSize: "12px", padding: "4px 8px", whiteSpace: 'nowrap' }} onClick={() => deleteClass(c.id)}>削除</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div className="form-group">
                  <label className="form-label">新規クラス名</label>
                  <input className="form-input" value={newClassName} onChange={e=>setNewClassName(e.target.value)} placeholder="例: 初級者クラス" />
                </div>
                <div className="form-group">
                  <label className="form-label">説明（任意）</label>
                  <input className="form-input" value={newClassDesc} onChange={e=>setNewClassDesc(e.target.value)} placeholder="説明を入力" />
                </div>
                <button className="btn btn-primary" onClick={handleCreateClass}>＋ クラスを作成</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">メンバー管理</div>
            {!selectedClass ? (
              <p style={{ color: 'var(--text-secondary)' }}>クラスを選択してください</p>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">メンバー一覧</label>
                  {members.length === 0 ? (
                    <EmptyState title="メンバーがいません" />
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {members.map(m => (
                        <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                          <span>{m.username}{m.is_admin? ' (admin)': ''}</span>
                          <button className="btn btn-danger" style={{ fontSize: "12px", padding: "4px 8px" }} onClick={()=>removeMember(m.id)}>削除</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">ユーザー追加</label>
                  <select multiple className="form-select" style={{ minHeight: 160 }} value={selectToAdd.map(String)} onChange={(e)=>{
                    const ids = Array.from(e.target.selectedOptions).map(o=>Number(o.value));
                    setSelectToAdd(ids);
                  }}>
                    {nonMembers.map(u => (
                      <option key={u.id} value={u.id}>{u.username}{u.is_admin? ' (admin)': ''}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-secondary" onClick={addMembers} disabled={selectToAdd.length === 0}>＋ 追加</button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="クラスを削除します"
        message="このクラスと関連するすべてのメンバー割当情報が削除されます。よろしいですか？"
        confirmText="削除"
        cancelText="キャンセル"
        isDangerous={true}
        onConfirm={confirmDeleteClass}
        onCancel={() => setConfirmDialog({ isOpen: false, classId: null })}
      />
    </div>
  );
};

export default AdminClassList;
