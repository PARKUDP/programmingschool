import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";

interface Assignment {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  input_example: string;
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
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [authFetch, activeTab]);

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
    if (!window.confirm("この割り当てを解除しますか？")) return;
    try {
      const res = await authFetch(`${apiEndpoints.assignments}/${assignmentId}/targets/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("解除失敗");
      // 再取得
      fetchData();
    } catch (err: any) {
      setError((err.message || "解除に失敗しました"));
    }
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

  if (!user?.is_admin) {
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
                                className="btn btn-primary"
                                onClick={() => navigate(`/admin/assignments/${assignment.id}/manage`)}
                                style={{ fontSize: "0.85rem", padding: "0.5rem 0.8rem", flex: 1 }}
                              >
                                割り当て
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleTestCaseClick(assignment.id)}
                                style={{ fontSize: "0.85rem", padding: "0.5rem 0.8rem", flex: 1 }}
                              >
                                テストケース
                              </button>
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
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>教材</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>レッスン</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>宿題</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>割り当て先</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>対象名</th>
                <th style={{ padding: "1rem", textAlign: "center", color: "var(--text-secondary)" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {assignedAssignments.map((item, index) => (
                <tr key={`${item.id}-${item.target_type}-${item.target_assigned_id || 'all'}-${index}`} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "1rem" }}>{item.material_title || "-"}</td>
                  <td style={{ padding: "1rem" }}>{item.lesson_title || "-"}</td>
                  <td style={{ padding: "1rem", fontWeight: "600" }}>{item.title}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "1rem",
                      fontSize: "0.85rem",
                      backgroundColor: item.target_type === "all" ? "#3b82f6" : item.target_type === "class" ? "#8b5cf6" : "#ec4899",
                      color: "white"
                    }}>
                      {item.target_label}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                    {item.target_name || "-"}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleUnassign(item.id, item.target_id)}
                      style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                    >
                      解除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )}
    </div>
  );
};

export default AdminAssignmentList;
