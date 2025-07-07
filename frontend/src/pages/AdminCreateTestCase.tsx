import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface Testcase {
  id: number;
  assignment_id: number;
  input: string;
  expected_output: string;
  comment: string;
  comment?: string;
}

const AdminCreateTestCase: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [testcases, setTestcases] = useState<Testcase[]>([]);
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!assignmentId) return;
    fetch(`http://localhost:5050/api/testcases?assignment_id=${assignmentId}`)
      .then((res) => res.json())
      .then((data) =>
        setTestcases(
          data.map((tc: any) => ({
            ...tc,
            comment: tc.comment ?? "",
          }))
        )
      );
  }, [problemId]);
      .then((data) => setTestcases(data));
  }, [assignmentId]);

  const handleAdd = () => {
    if (!assignmentId) return;
    fetch("http://localhost:5050/api/testcases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignment_id: Number(assignmentId),
        input,
        expected_output: expected,
        comment,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTestcases((prev) => [
          ...prev,
          {
            id: data.testcase_id,
            assignment_id: Number(assignmentId),
            input,
            expected_output: expected,
            comment,
          },
        ]);
        setInput("");
        setExpected("");
        setComment("");
      });
  };

  const handleUpdate = (tc: Testcase) => {
    fetch(`http://localhost:5050/api/testcases/${tc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: tc.input,
        expected_output: tc.expected_output,
        comment: tc.comment,
      }),
    }).then(() => {
      setTestcases((prev) =>
        prev.map((t) => (t.id === tc.id ? tc : t))
      );
    });
  };

  const handleDelete = (id: number) => {
    fetch(`http://localhost:5050/api/testcases/${id}`, { method: "DELETE" }).then(
      () => {
        setTestcases((prev) => prev.filter((t) => t.id !== id));
      }
    );
  };

  const updateField = (
    id: number,
    field: "input" | "expected_output" | "comment",
    value: string
  ) => {
    setTestcases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>テストケース管理</h1>
      <div>
        <h2>新規追加</h2>
        <textarea
          placeholder="入力"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <br />
        <textarea
          placeholder="期待出力"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
        />
        <br />
        <textarea
          placeholder="コメント"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <br />
        <button onClick={handleAdd}>追加</button>
      </div>

      <h2 style={{ marginTop: "2rem" }}>既存テストケース</h2>
      <ul>
        {testcases.map((tc) => (
          <li key={tc.id} style={{ marginBottom: "1rem" }}>
            <textarea
              value={tc.input}
              onChange={(e) => updateField(tc.id, "input", e.target.value)}
            />
            <br />
            <textarea
              value={tc.expected_output}
              onChange={(e) =>
                updateField(tc.id, "expected_output", e.target.value)
              }
            />
            <br />
            <textarea
              value={tc.comment}
              onChange={(e) => updateField(tc.id, "comment", e.target.value)}
              placeholder="コメント"
            />
            <br />
            <button onClick={() => handleUpdate(tc)}>更新</button>
            <button onClick={() => handleDelete(tc.id)} style={{ marginLeft: "0.5rem" }}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminCreateTestCase;
