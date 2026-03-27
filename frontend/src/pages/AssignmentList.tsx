import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

export type Assignment = {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  input_example: string;
  file_path: string | null;
  created_at: string;
};

type Lesson = {
  id: number;
  title: string;
  material_id: number;
};

type Material = {
  id: number;
  title: string;
};

type Submission = {
  id: number;
  assignment_id: number;
  is_correct: number;
  submitted_at: string;
};

const AssignmentList: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { authFetch, user } = useAuth();
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetchData();
  }, [authFetch, user]);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [assignRes, lessonRes, matRes, submissionRes] = await Promise.all([
        authFetch(apiEndpoints.assignmentsAvailable),
        authFetch(apiEndpoints.lessons),
        authFetch(apiEndpoints.materials),
        authFetch(`${apiEndpoints.submissions}/${user.id}`),
      ]);

      if (!assignRes.ok || !lessonRes.ok || !matRes.ok || !submissionRes.ok) {
        throw new Error("宿題一覧の取得に失敗しました");
      }

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
      console.error("課題の取得に失敗しました:", err);
      setAssignments([]);
      setLessons([]);
      setMaterials([]);
      setSubmissions([]);
      setError(err.message || "課題の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const passedAssignmentIds = useMemo(
    () => new Set(submissions.filter((s) => s.is_correct === 1).map((s) => s.assignment_id)),
    [submissions]
  );

  const activeAssignments = useMemo(
    () => assignments.filter((a) => !passedAssignmentIds.has(a.id)),
    [assignments, passedAssignmentIds]
  );

  const groupedData = useMemo(() => {
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
  }, [activeAssignments, lessons, materials]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">宿題一覧</h1>
          <p className="page-subtitle">教材ごとに宿題を確認できます</p>
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
        <p className="page-subtitle">教材 → レッスン → 宿題の順で確認できます</p>
      </div>

      {error && <div className="message message-error">{error}</div>}

        {/* パンくずナビゲーション */}
        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          <button
            onClick={() => { setSelectedMaterial(null); setSelectedLesson(null); }}
            style={{
              background: "none", border: "none", cursor: selectedMaterial ? "pointer" : "default",
              color: selectedMaterial ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: selectedMaterial ? "600" : "400", padding: 0, fontSize: "0.9rem"
            }}
          >
            教材一覧
          </button>
          {selectedMaterial && (
            <>
              <span>›</span>
              <button
                onClick={() => setSelectedLesson(null)}
                style={{
                  background: "none", border: "none", cursor: selectedLesson ? "pointer" : "default",
                  color: selectedLesson ? "var(--primary)" : "var(--text-secondary)",
                  fontWeight: selectedLesson ? "600" : "400", padding: 0, fontSize: "0.9rem"
                }}
              >
                {selectedMaterial.title}
              </button>
            </>
          )}
          {selectedLesson && (
            <>
              <span>›</span>
              <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{selectedLesson.title}</span>
            </>
          )}
        </div>

        {!selectedMaterial ? (
          // 教材一覧画面
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
              {groupedData.map(({ material }) => (
                <button
                  key={material.id}
                  onClick={() => { setSelectedMaterial(material); setSelectedLesson(null); }}
                  style={{
                    padding: "2rem", border: "2px solid var(--border)", borderRadius: "8px", background: "#f8fafc",
                    cursor: "pointer", fontSize: "1.1rem", fontWeight: "600", color: "var(--primary)",
                    transition: "all 0.2s", textAlign: "center"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "rgba(var(--primary-rgb), 0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  {material.title}
                </button>
              ))}
            </div>
            {groupedData.length === 0 && (
              <p style={{ color: "var(--text-secondary)", margin: "0" }}>
                {assignments.length === 0 ? "割り当てられた宿題がまだありません" : "すべての宿題に合格しました！"}
              </p>
            )}
        </div>
        ) : !selectedLesson ? (
          // レッスン一覧画面
          <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem", padding: "1.5rem" }}>
            {groupedData
              .find((g) => g.material.id === selectedMaterial.id)
              ?.lessonList.map(({ lesson }) => (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  style={{
                    padding: "2rem", border: "2px solid var(--border)", borderRadius: "8px", background: "#f8fafc",
                    cursor: "pointer", fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)",
                    transition: "all 0.2s", textAlign: "center"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "rgba(var(--primary-rgb), 0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  {lesson.title}
                </button>
              ))
            }
          </div>
        ) : (
          // 宿題一覧画面
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.75rem" }}>
            {groupedData
              .find((g) => g.material.id === selectedMaterial.id)
              ?.lessonList.find((l) => l.lesson.id === selectedLesson.id)
              ?.assignments.map((assignment) => (
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
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>宿題</div>
                    <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>{assignment.title}</div>
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
              ))
            }
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
