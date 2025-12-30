import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

interface Assignment {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  input_example: string;
  file_path: string | null;
  created_at: string;
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

interface Submission {
  id: number;
  assignment_id: number;
  is_correct: number;
  submitted_at: string;
}

const ProblemList: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { authFetch, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [authFetch, user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [assignRes, lessonRes, matRes, submissionRes] = await Promise.all([
        authFetch(apiEndpoints.assignmentsAvailable),
        authFetch(apiEndpoints.lessons),
        authFetch(apiEndpoints.materials),
        authFetch(`${apiEndpoints.submissions}/${user.id}`),
      ]);

      const assignData = await assignRes.json();
      const lessonData = await lessonRes.json();
      const matData = await matRes.json();
      const submissionData = await submissionRes.json();

      setAssignments(Array.isArray(assignData) ? assignData : assignData.assignments || []);
      setLessons(Array.isArray(lessonData) ? lessonData : lessonData.lessons || []);
      setMaterials(Array.isArray(matData) ? matData : matData.materials || []);
      setSubmissions(Array.isArray(submissionData) ? submissionData : submissionData.submissions || []);
      setError("");
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("データの取得に失敗しました: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 合格済みの宿題IDを取得
  const passedAssignmentIds = new Set(
    submissions
      .filter((s) => s.is_correct === 1)
      .map((s) => s.assignment_id)
  );

  // 合格していない宿題のみフィルタリング
  const activeAssignments = assignments.filter((a) => !passedAssignmentIds.has(a.id));

  // 教材ごとにグループ化
  const groupedData = React.useMemo(() => {
    const grouped: Record<
      number,
      { material: Material; lessonGroups: Record<number, { lesson: Lesson; assignments: Assignment[] }> }
    > = {};

    materials.forEach((mat) => {
      grouped[mat.id] = { material: mat, lessonGroups: {} };
    });

    lessons.forEach((lesson) => {
      if (grouped[lesson.material_id]) {
        grouped[lesson.material_id].lessonGroups[lesson.id] = { lesson, assignments: [] };
      }
    });

    activeAssignments.forEach((assignment) => {
      const lesson = lessons.find((l) => l.id === assignment.lesson_id);
      if (lesson && grouped[lesson.material_id]?.lessonGroups[lesson.id]) {
        grouped[lesson.material_id].lessonGroups[lesson.id].assignments.push(assignment);
      }
    });

    return grouped;
  }, [materials, lessons, activeAssignments]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">宿題一覧</h1>
          <p className="page-subtitle">割り当てられた宿題に取り組んでください</p>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">宿題一覧</h1>
        <p className="page-subtitle">割り当てられた宿題に取り組んでください</p>
      </div>

      {error && <div className="message message-error">{error}</div>}

      {activeAssignments.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-secondary)", margin: "0" }}>
            {assignments.length === 0 ? "割り当てられた宿題がまだありません" : "すべての宿題に合格しました！"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {materials.map((material) => {
            const materialData = groupedData[material.id];
            if (!materialData || Object.keys(materialData.lessonGroups).length === 0) return null;

            return (
              <div key={material.id} className="card">
                <div
                  className="card-title"
                  style={{ fontSize: "1.3rem", marginBottom: "1.5rem", color: "var(--primary)" }}
                >
                  {material.title}
                </div>

                {Object.values(materialData.lessonGroups).map(({ lesson, assignments }) => {
                  if (assignments.length === 0) return null;

                  return (
                    <div
                      key={lesson.id}
                      style={{
                        marginBottom: "2rem",
                        paddingLeft: "1rem",
                        borderLeft: "3px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: "600",
                          marginBottom: "1rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        {lesson.title}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                          gap: "1rem",
                        }}
                      >
                        {assignments.map((assignment) => (
                          <Link
                            key={assignment.id}
                            to={`/assignments/${assignment.id}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <div
                              style={{
                                padding: "1rem",
                                backgroundColor: "#f9fafb",
                                borderRadius: "0.5rem",
                                border: "1px solid var(--border)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f3f4f6";
                                e.currentTarget.style.borderColor = "var(--primary)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#f9fafb";
                                e.currentTarget.style.borderColor = "var(--border)";
                              }}
                            >
                              <div style={{ marginBottom: "0.75rem" }}>
                                <div style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.25rem" }}>
                                  {assignment.title}
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                  {new Date(assignment.created_at).toLocaleDateString("ja-JP")}
                                </div>
                              </div>

                              {assignment.description && (
                                <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem", color: "var(--text-secondary)", flex: 1 }}>
                                  {assignment.description}
                                </div>
                              )}
                            </div>
                          </Link>
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
    </div>
  );
};

export default ProblemList;
