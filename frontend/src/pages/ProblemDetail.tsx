import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import CodeEditor from "../components/CodeEditor";

type Problem = {
  id: number;
  lesson_id: number;
  title: string;
  markdown: string;
  created_at: string;
};

const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>("# Pythonのコードをここに書いてください");
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    fetch("http://localhost:5050/api/problems")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((p: Problem) => p.id === Number(id));
        setProblem(found);
      });
  }, [id]);

  const handleSubmit = () => {
    fetch("http://localhost:5050/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: 1,
        problem_id: Number(id),
        code: code,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setResult(`結果: ${data.result}\n出力: ${data.output}`);
      });
  };

  if (!problem) return <p>読み込み中...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{problem.title}</h1>
      <ReactMarkdown>{problem.markdown}</ReactMarkdown>

      <CodeEditor value={code} onChange={setCode} />

      <button onClick={handleSubmit} style={{ marginTop: "1rem" }}>
        提出
      </button>
      <pre>{result}</pre>
    </div>
  );
};

export default ProblemDetail;
