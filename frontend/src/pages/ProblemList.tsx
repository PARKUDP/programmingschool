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

  // 表示対象（未合格の宿題）のみを教材→レッスンへグループ化
  const groupedData = React.useMemo(() => {
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const materialById = new Map(materials.map((material) => [material.id, material]));

    const grouped: Record<
      number,
      {
        material: Material;
        lessons: Record<number, { lesson: Lesson; assignments: Assignment[] }>;
      }
    > = {};

    activeAssignments.forEach((assignment) => {
      const lesson = lessonById.get(assignment.lesson_id);
      if (!lesson) return;

      const material = materialById.get(lesson.material_id);
      if (!material) return;

      if (!grouped[material.id]) {
        grouped[material.id] = { material, lessons: {} };
      }

      if (!grouped[material.id].lessons[lesson.id]) {
        grouped[material.id].lessons[lesson.id] = { lesson, assignments: [] };
      }

      grouped[material.id].lessons[lesson.id].assignments.push(assignment);
    });

    return Object.values(grouped)
      .map((materialGroup) => ({
        ...materialGroup,
        lessonList: Object.values(materialGroup.lessons).filter((lessonGroup) => lessonGroup.assignments.length > 0),
      }))
      .filter((materialGroup) => materialGroup.lessonList.length > 0);
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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {groupedData.map(({ material, lessonList }) => (
            <section key={material.id} className="card" aria-label={`教材: ${material.title}`}>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>教材</div>
                <h2 style={{ margin: 0, color: "var(--primary)", fontSize: "1.35rem" }}>{material.title}</h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {lessonList.map(({ lesson, assignments }) => (
                  <article
                    key={lesson.id}
                    style={{
                      borderLeft: "3px solid var(--border)",
                      paddingLeft: "1rem",
                    }}
                    aria-label={`レッスン: ${lesson.title}`}
                  >
                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>レッスン</div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>{lesson.title}</h3>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: "0.75rem",
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
                              border: "1px solid var(--border)",
                              borderRadius: "10px",
                              padding: "0.9rem",
                              background: "#f8fafc",
                              height: "100%",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f3f4f6";
                              e.currentTarget.style.borderColor = "var(--primary)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#f8fafc";
                              e.currentTarget.style.borderColor = "var(--border)";
                            }}
                          >
                            <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>宿題</div>
                            <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                              {assignment.title}
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                              {new Date(assignment.created_at).toLocaleDateString("ja-JP")}
                            </div>

                            {assignment.description && (
                              <p style={{ margin: "0.6rem 0 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                {assignment.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProblemList;
