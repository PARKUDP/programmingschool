import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch("http://localhost:5050/api/assignments")
      .then((res) => res.json())
      .then((data) => setAssignments(data))
      .catch((err) => console.error("宿題の取得に失敗しました:", err));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>宿題一覧</h1>
      <ul>
        {assignments.map((a) => (
          <li key={a.id} style={{ marginBottom: "2rem" }}>
            <Link to={`/assignments/${a.id}`}>
              <h2>{a.title}</h2>
            </Link>
            <p>{a.question_text}</p>
            <p>宿題ID: {a.id} / レッスンID: {a.lesson_id}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProblemList;
