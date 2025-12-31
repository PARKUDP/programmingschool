import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";

interface Assignment {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  input_example: string;
   expected_output?: string;
   problem_type?: string;
  created_at: string;
  lesson_title?: string;
  material_title?: string;
}

interface AssignedAssignment {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  lesson_title: string;
  material_title: string;
  material_id?: number;
  target_id: number;
  target_type: string;
  target_assigned_id: number | null;
  target_label: string;
  target_name: string | null;
}

interface Lesson {
  id: number;
  title: string;
  material_id: number;
}

interface Material {
  id: number;
  title: string;
}

const AdminAssignmentList: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignedAssignments, setAssignedAssignments] = useState<AssignedAssignment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "assigned">("list");
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; assignmentId: number | null; targetId: number | null; title: string; message: string }>(
    { isOpen: false, assignmentId: null, targetId: null, title: "", message: "" }
  );
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const isStaff = user?.is_admin || user?.role === "teacher";

  useEffect(() => {
    if (!isStaff) return;
    fetchData();
  }, [authFetch, activeTab, isStaff]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === "list") {
        // 宿題一覧タブ
        const [assignRes, lessonRes, matRes] = await Promise.all([
          authFetch(apiEndpoints.assignments),
          authFetch(apiEndpoints.lessons),
          authFetch(apiEndpoints.materials)
        ]);
        
        const assignData = await assignRes.json();
        const lessonData = await lessonRes.json();
        const matData = await matRes.json();

        setAssignments(Array.isArray(assignData) ? assignData : assignData.assignments || []);
        setLessons(Array.isArray(lessonData) ? lessonData : lessonData.lessons || []);
        setMaterials(Array.isArray(matData) ? matData : matData.materials || []);
      } else {
        // 割り当て管理タブ
        const res = await authFetch(`${apiEndpoints.assignments}/assigned`);
        if (!res.ok) throw new Error("割り当て済み宿題の取得に失敗しました");
        const data = await res.json();
        setAssignedAssignments(data.assigned || []);
      }
      
      setError("");
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError("データの取得に失敗しました: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (assignmentId: number, targetId: number) => {
    try {
      const res = await authFetch(`${apiEndpoints.assignments}/${assignmentId}/targets/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("解除失敗");
      fetchData();
    } catch (err: any) {
      setError((err.message || "解除に失敗しました"));
    }
  };

  const openConfirm = (assignmentId: number, targetId: number | null, label: string) => {
    setConfirmDialog({
      isOpen: true,
      assignmentId,
      targetId: targetId ?? null,
      title: "割り当てを解除",
      message: `${label} の割り当てを解除しますか？`
    });
  };

  const closeConfirm = () => setConfirmDialog({ isOpen: false, assignmentId: null, targetId: null, title: "", message: "" });

  const confirmUnassign = async () => {
   if (confirmDialog.assignmentId == null || confirmDialog.targetId == null) {
      closeConfirm();
      return;
    }
    await handleUnassign(confirmDialog.assignmentId, confirmDialog.targetId);
    closeConfirm();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("本当にこの宿題を削除しますか？")) return;
    try {
      const res = await authFetch(`${apiEndpoints.assignments}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("削除失敗");
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      setError((err.message || "削除に失敗しました"));
    }
  };

  const handleTestCaseClick = (assignmentId: number) => {
    navigate(`/admin/assignments/${assignmentId}/testcases/create`);
  };

  // 教材ごとにグループ化 - Hooksは常に同じ順序で呼ぶ必要がある
  const groupedData = React.useMemo(() => {
    const grouped: Record<number, { material: Material; lessonGroups: Record<number, { lesson: Lesson; assignments: Assignment[] }> }> = {};
    
    materials.forEach(mat => {
      grouped[mat.id] = { material: mat, lessonGroups: {} };
    });
    
    lessons.forEach(lesson => {
      if (grouped[lesson.material_id]) {
        grouped[lesson.material_id].lessonGroups[lesson.id] = { lesson, assignments: [] };
      }
    });
    
    assignments.forEach(assignment => {
      const lesson = lessons.find(l => l.id === assignment.lesson_id);
      if (lesson && grouped[lesson.material_id]?.lessonGroups[lesson.id]) {
        grouped[lesson.material_id].lessonGroups[lesson.id].assignments.push(assignment);
      }
    });
    
    return grouped;
  }, [materials, lessons, assignments]);

  const groupedAssigned = React.useMemo(() => {
    const byAssignment: Record<number, { info: AssignedAssignment; targets: AssignedAssignment[] }> = {};
    assignedAssignments.forEach((item) => {
      if (!byAssignment[item.id]) {
        byAssignment[item.id] = { info: item, targets: [] };
      }
      byAssignment[item.id].targets.push(item);
    });
    return byAssignment;
  }, [assignedAssignments]);

  const groupedAssignedHierarchy = React.useMemo(() => {
    const materialsMap: Record<number, { materialId: number; materialTitle: string; lessons: Record<number, { lessonId: number; lessonTitle: string; assignments: Array<{ info: AssignedAssignment; targets: AssignedAssignment[] }> }> }> = {};

    Object.values(groupedAssigned).forEach(({ info, targets }) => {
      const mId = info.material_id ?? -info.lesson_id; // fallback key
      if (!materialsMap[mId]) {
        materialsMap[mId] = {
          materialId: mId,
          materialTitle: info.material_title || "-",
          lessons: {}
        };
      }

      const lessonsMap = materialsMap[mId].lessons;
      if (!lessonsMap[info.lesson_id]) {
        lessonsMap[info.lesson_id] = {
          lessonId: info.lesson_id,
          lessonTitle: info.lesson_title || "-",
          assignments: []
        };
      }

      lessonsMap[info.lesson_id].assignments.push({ info, targets });
    });

    return Object.values(materialsMap).map((m) => ({
      ...m,
      lessons: Object.values(m.lessons)
    }));
  }, [groupedAssigned]);

  if (!isStaff) {
    return (
      <div className="page-container">
        <p className="message message-error">権限がありません</p>
      </div>
    );
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="解除する"
          cancelText="キャンセル"
          isDangerous
          onConfirm={confirmUnassign}
          onCancel={closeConfirm}
        />
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
        title="宿題管理"
        subtitle="作成した宿題を管理します"
        breadcrumbs={[{ label: "管理" }, { label: "宿題" }]}
      />

      {error && <div className="message message-error">{error}</div>}

      {/* タブ切り替え */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", borderBottom: "2px solid var(--border)" }}>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            padding: "0.75rem 1.5rem",
            background: activeTab === "list" ? "var(--primary)" : "transparent",
            color: activeTab === "list" ? "white" : "var(--text-secondary)",
            border: "none",
            borderBottom: activeTab === "list" ? "3px solid var(--primary)" : "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "1rem",
            transition: "all 0.2s"
          }}
        >
          宿題一覧
        </button>
        <button
          onClick={() => setActiveTab("assigned")}
          style={{
            padding: "0.75rem 1.5rem",
            background: activeTab === "assigned" ? "var(--primary)" : "transparent",
            color: activeTab === "assigned" ? "white" : "var(--text-secondary)",
            border: "none",
            borderBottom: activeTab === "assigned" ? "3px solid var(--primary)" : "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "1rem",
            transition: "all 0.2s"
          }}
        >
          割り当て管理
        </button>
      </div>

      {activeTab === "list" ? (
        <>
          <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/admin/assignments/create")}
            >
              新しい宿題を作成
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
              <EmptyState title="宿題がまだ作成されていません" />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {materials.map(material => {
                const materialData = groupedData[material.id];
                if (!materialData || Object.keys(materialData.lessonGroups).length === 0) return null;
                
                return (
                  <div key={material.id} className="card">
                    <div className="card-title" style={{ fontSize: "1.3rem", marginBottom: "1.5rem", color: "var(--primary)" }}>
                      {material.title}
                    </div>
                    
                    {Object.values(materialData.lessonGroups).map(({ lesson, assignments }) => {
                      if (assignments.length === 0) return null;
                      
                      return (
                        <div key={lesson.id} style={{ marginBottom: "2rem", paddingLeft: "1rem", borderLeft: "3px solid var(--border)" }}>
                          <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-primary)" }}>
                            {lesson.title}
                          </div>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "1rem" }}>
                            {assignments.map(assignment => (
                              <div key={assignment.id} style={{ 
                                padding: "1.5rem", 
                                backgroundColor: "#f9fafb", 
                                borderRadius: "0.5rem",
                                border: "1px solid var(--border)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "1rem"
                              }}>
                                {/* タイトルと説明 */}
                                <div>
                                  <div style={{ fontWeight: "600", fontSize: "1rem", marginBottom: "0.25rem" }}>{assignment.title}</div>
                                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                    {new Date(assignment.created_at).toLocaleDateString("ja-JP")}
                                  </div>
                                  <div style={{ marginTop: "0.3rem", display: "inline-block", padding: "0.25rem 0.6rem", borderRadius: "0.35rem", fontSize: "0.8rem", backgroundColor: "rgba(59,130,246,0.1)", color: "#1d4ed8" }}>
                                    {assignment.problem_type === "code" ? "コード" : assignment.problem_type === "essay" ? "記述式" : "選択式"}
                                  </div>
                                </div>

                                {/* 説明 */}
                                {assignment.description && (
                                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                    {assignment.description}
                                  </div>
                                )}
                            
                            {/* 問題文 */}
                            {assignment.question_text && (
                              <div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: "600" }}>問題文:</div>
                                <div style={{
                                  padding: "0.75rem",
                                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                                  borderRadius: "0.25rem",
                                  fontSize: "0.8rem",
                                  maxHeight: "150px",
                                  overflowY: "auto",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  color: "var(--text-secondary)"
                                }}>
                                  {assignment.question_text}
                                </div>
                              </div>
                            )}
                            
                            {/* ボタン */}
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                              <button
                                className="btn btn-secondary"
                                onClick={() => navigate(`/admin/assignments/${assignment.id}/edit`)}
                                style={{ fontSize: "0.85rem", padding: "0.5rem 0.8rem", flex: 1 }}
                              >
                                編集
                              </button>
                              <button
                                className="btn btn-primary"
                                onClick={() => navigate(`/admin/assignments/${assignment.id}/manage`)}
                                style={{ fontSize: "0.85rem", padding: "0.5rem 0.8rem", flex: 1 }}
                              >
                                割り当て
                              </button>
                              {assignment.problem_type === "code" && (
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleTestCaseClick(assignment.id)}
                                  style={{ fontSize: "0.85rem", padding: "0.5rem 0.8rem", flex: 1 }}
                                >
                                  テストケース
                                </button>
                              )}
                              <button
                                className="btn btn-danger"
                                onClick={() => handleDelete(assignment.id)}
                                style={{ fontSize: "0.85rem", padding: "0.5rem 0.8rem", flex: 1 }}
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </>
  ) : (
    // 割り当て管理タブ
    <>
      {assignedAssignments.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <EmptyState title="割り当てられた宿題がありません" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {groupedAssignedHierarchy.map((mat) => (
            <div key={mat.materialId} className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>{mat.materialTitle}</div>
              {mat.lessons.map((lesson) => (
                <div key={`${mat.materialId}-${lesson.lessonId}`} style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "1rem", background: "#f9fafb", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>{lesson.lessonTitle}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.75rem" }}>
                    {lesson.assignments.map(({ info, targets }) => (
                      <div key={`${info.id}-assigned`} style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.9rem", background: "white", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{info.title}</div>
                          </div>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }}
                            onClick={() => navigate(`/admin/assignments/${info.id}/manage`)}
                          >
                            割り当て
                          </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                          {targets.map((t) => (
                            <span
                              key={`${t.id}-${t.target_type}-${t.target_assigned_id || "all"}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                padding: "0.3rem 0.6rem",
                                borderRadius: "9999px",
                                fontSize: "0.8rem",
                                backgroundColor:
                                  t.target_type === "all" ? "#3b82f6" : t.target_type === "class" ? "#8b5cf6" : "#ec4899",
                                color: "white"
                              }}
                            >
                              <span>
                                {t.target_type === "all" ? "全体" : t.target_name || "-"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConfirm(
                                      info.assignment_id || info.id,
                                      t.target_id,
                                    t.target_type === "all" ? "全体" : (t.target_name || "対象")
                                  );
                                }}
                                title="解除"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "white",
                                  cursor: "pointer",
                                  padding: 0,
                                  lineHeight: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                          {targets.length === 0 && (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>割り当てなし</span>
                          )}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )}
    </div>
  );
};

export default AdminAssignmentList;
