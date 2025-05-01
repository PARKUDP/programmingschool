import React, { useEffect, useState } from "react";

type Submission = {
  id: number;
  problem_id: number;
  result: string;
  output: string;
  submitted_at: string;
};

const SubmissionHistory: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5001/api/submissions/1")
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("履歴取得に失敗しました", err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>提出履歴</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : submissions.length === 0 ? (
        <p>まだ提出がありません。</p>
      ) : (
        <ul>
          {submissions.map((s) => (
            <li key={s.id} style={{ marginBottom: "1.5rem" }}>
              <p><strong>提出ID:</strong> {s.id}</p>
              <p><strong>問題ID:</strong> {s.problem_id}</p>
              <p><strong>結果:</strong> {s.result}</p>
              <p><strong>提出時刻:</strong> {new Date(s.submitted_at).toLocaleString()}</p>
              <details>
                <summary>出力を表示</summary>
                <pre>{s.output}</pre>
              </details>
              <hr />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SubmissionHistory;
