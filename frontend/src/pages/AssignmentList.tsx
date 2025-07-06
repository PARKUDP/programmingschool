import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch("http://localhost:5050/api/assignments")
      .then(res => res.json())
      .then(data => setAssignments(data));
  }, []);

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
                <a href={`http://localhost:5050/${a.file_path}`} target="_blank" rel="noopener noreferrer">
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
