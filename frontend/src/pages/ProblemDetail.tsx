import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CodeEditor from "../components/CodeEditor";

type Assignment = {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  input_example: string;
  file_path: string | null;
};

const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { authFetch } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [code, setCode] = useState<string>("# Pythonのコードをここに書いてください");
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    authFetch(`http://localhost:5050/api/assignments/${id}`)
      .then((res) => res.json())
      .then((data) => setAssignment(data));
  }, [id]);

  const handleSubmit = () => {
    authFetch("http://localhost:5050/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignment_id: Number(id),
        code: code,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setResult(`結果: ${data.is_correct ? "AC" : "WA"}\n${data.feedback}`);
      });
  };

  if (!assignment) return <p>読み込み中...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{assignment.title}</h1>
      <p>{assignment.question_text}</p>

      <CodeEditor value={code} onChange={setCode} />

      <button onClick={handleSubmit} style={{ marginTop: "1rem" }}>
        提出
      </button>
      <pre>{result}</pre>
    </div>
  );
};

export default ProblemDetail;
