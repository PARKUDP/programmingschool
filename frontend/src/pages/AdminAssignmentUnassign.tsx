import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints, API_BASE_URL } from "../config/api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";

interface AssignmentTarget {
  id: number;
  assignment_id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  lesson_title: string;
  material_title: string;
  target_id: number;
  target_type: string;
  target_assigned_id: number | null;
  target_label: string;
  target_name: string;
}

const AdminAssignmentUnassign: React.FC = () => {
  const [assigned, setAssigned] = useState<AssignmentTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    assignmentId: number;
    targetId: number;
    targetLabel: string;
  }>({
    open: false,
    assignmentId: 0,
    targetId: 0,
    targetLabel: "",
  });
  const { authFetch, user } = useAuth();
  const isStaff = user?.is_admin || user?.role === "teacher";

  useEffect(() => {
    if (!isStaff) return;
    fetchAssignedAssignments();
  }, [authFetch, isStaff]);

  const fetchAssignedAssignments = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/api/assignments/assigned`);
      if (!res.ok) throw new Error("割り当て済み宿題の取得に失敗しました");
      const data = await res.json();
      setAssigned(data.assigned || []);
      setError("");
    } catch (err: any) {
      setError("データの取得に失敗しました: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirmDialog = (assignmentId: number, targetId: number, targetLabel: string) => {
    setConfirmDialog({
      open: true,
      assignmentId,
      targetId,
      targetLabel,
    });
  };

  const handleConfirmRemove = async () => {
    const { assignmentId, targetId } = confirmDialog;
    setConfirmDialog(prev => ({ ...prev, open: false }));
    
    try {
      const res = await authFetch(`${API_BASE_URL}/api/assignments/${assignmentId}/targets/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("割り当て解除に失敗しました");
      setMessage("割り当てを解除しました");
      setAssigned(prev => prev.filter(a => a.target_id !== targetId));
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setError((err.message || "割り当て解除に失敗しました"));
    }
  };

  const handleCancelRemove = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  // 教材ごとにグループ化
  const groupedData = React.useMemo(() => {
    const grouped: Record<string, Record<string, AssignmentTarget[]>> = {};
    
    assigned.forEach(item => {
      if (!grouped[item.material_title]) {
        grouped[item.material_title] = {};
      }
      if (!grouped[item.material_title][item.lesson_title]) {
        grouped[item.material_title][item.lesson_title] = [];
      }
      grouped[item.material_title][item.lesson_title].push(item);
    });
    
    return grouped;
  }, [assigned]);

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

  return (
    <div className="page-container">
      <PageHeader
        title="割り当て解除"
        subtitle="割り当て済みの宿題から割り当てを解除します"
        breadcrumbs={[{ label: "管理" }, { label: "割り当て解除" }]}
      />

      {message && <div className="message message-success">{message}</div>}
      {error && <div className="message message-error">{error}</div>}

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title="割り当ての解除"
        message={`「${confirmDialog.targetLabel}」への割り当てを解除してもよろしいですか？`}
        confirmText="解除する"
        cancelText="キャンセル"
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
      />

      {assigned.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <EmptyState title="割り当て済みの宿題がありません" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {Object.entries(groupedData).map(([materialTitle, lessonGroups]) => (
            <div key={materialTitle} className="card">
              <div className="card-title" style={{ fontSize: "1.3rem", marginBottom: "1.5rem", color: "var(--primary)" }}>
                {materialTitle}
              </div>
              
              {Object.entries(lessonGroups).map(([lessonTitle, items]) => (
                <div key={lessonTitle} style={{ marginBottom: "2rem", paddingLeft: "1rem", borderLeft: "3px solid var(--border)" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-primary)" }}>
                    {lessonTitle}
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1rem" }}>
                    {items.map(item => (
                      <div key={`${item.assignment_id}-${item.target_id}`} style={{
                        padding: "1rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "0.5rem",
                        border: "1px solid var(--border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem"
                      }}>
                        {/* タイトル */}
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{item.title}</div>
                          {item.description && (
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                              {item.description}
                            </div>
                          )}
                        </div>

                        {/* 割り当て先情報 */}
                        <div style={{
                          padding: "0.75rem",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          borderRadius: "0.4rem",
                          borderLeft: "3px solid #3b82f6",
                          fontSize: "0.9rem"
                        }}>
                          <div>
                            <strong>割り当て先:</strong>{" "}
                            <span style={{ color: "#3b82f6", fontWeight: "600" }}>
                              {item.target_label}
                            </span>
                          </div>
                          {item.target_name && (
                            <div style={{ marginTop: "0.25rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              {item.target_name}
                            </div>
                          )}
                        </div>

                        {/* 解除ボタン */}
                        <button
                          className="btn btn-danger"
                          onClick={() => handleOpenConfirmDialog(item.assignment_id, item.target_id, item.target_label)}
                          style={{ marginTop: "auto", width: "100%", fontSize: "0.85rem" }}
                        >
                          この割り当てを解除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAssignmentUnassign;
