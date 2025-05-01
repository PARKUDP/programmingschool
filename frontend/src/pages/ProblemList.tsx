import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

type Problem = {
  id: number;
  lesson_id: number;
  title: string;
  markdown: string;
  created_at: string;
};

const ProblemList: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    fetch("http://localhost:5001/api/problems")
      .then((res) => res.json())
      .then((data) => setProblems(data))
      .catch((err) => console.error("問題の取得に失敗しました:", err));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Python問題一覧</h1>
      <ul>
        {problems.map((problem) => (
          <li key={problem.id} style={{ marginBottom: "2rem" }}>
            <Link to={`/problems/${problem.id}`}>
              <h2>{problem.title}</h2>
            </Link>
            <ReactMarkdown>{problem.markdown}</ReactMarkdown>
            <p>問題ID: {problem.id} / レッスンID: {problem.lesson_id}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProblemList;
