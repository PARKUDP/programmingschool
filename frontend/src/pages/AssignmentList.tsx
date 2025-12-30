import React, { useEffect, useState } from "react";
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
};

const AssignmentList: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch(apiEndpoints.assignmentsAvailable)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setAssignments(data);
        } else {
          console.error("予期しないデータ形式:", data);
          setAssignments([]);
        }
      })
      .catch((err) => {
        console.error("課題の取得に失敗しました:", err);
        setAssignments([]);
      });
  }, [authFetch]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>宿題一覧</h1>
      <ul>
        {assignments.map(a => (
          <li key={a.id} style={{ marginBottom: "1rem" }}>
            <h3>{a.title}</h3>
            <p>{a.question_text}</p>
            {a.file_path && (
              <p>
                <a href={`${apiEndpoints.assignments}/../${a.file_path}`} target="_blank" rel="noopener noreferrer">
                  添付ファイル
                </a>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssignmentList;
