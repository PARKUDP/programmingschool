import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import ReactMarkdown from "react-markdown";

type Assignment = {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  input_example: string;
  file_path: string | null;
};

const ProblemList: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch(apiEndpoints.assignments)
      .then((res) => res.json())
      .then((data) => {
        setAssignments(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("宿題の取得に失敗しました:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📖 課題一覧</h1>
        <p className="page-subtitle">割り当てられた課題に取り組んでください</p>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "48px", marginBottom: "1rem" }}>📭</div>
          <p style={{ color: "var(--text-secondary)", margin: "0" }}>
            課題がまだありません
          </p>
        </div>
      ) : (
        <div className="grid">
          {assignments.map((a) => (
            <Link
              key={a.id}
              to={`/assignments/${a.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="card">
                <div style={{ fontSize: "32px", marginBottom: "1rem" }}>✏️</div>
                <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 0.5rem 0", lineHeight: "1.4", color: "var(--text-primary)" }}>
                  {a.title}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "0 0 1rem 0", lineHeight: "1.5", flex: 1 }}>
                  {a.description || a.question_text?.substring(0, 100) || "説明なし"}
                </p>
                <div style={{ display: "flex", gap: "1rem", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <span className="badge badge-info">ID: {a.id}</span>
                  <span className="badge badge-info">Lesson: {a.lesson_id}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProblemList;
