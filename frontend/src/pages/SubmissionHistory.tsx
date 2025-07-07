import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

type Submission = {
  id: number;
  assignment_id: number;
  is_correct: number;
  feedback: string;
  submitted_at: string;
};

const SubmissionHistory: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, authFetch } = useAuth();

  useEffect(() => {
    if (!user) return;
    authFetch(`http://localhost:5050/api/submissions/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("履歴取得に失敗しました", err);
        setLoading(false);
      });
  }, [user]);

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
              <p><strong>宿題ID:</strong> {s.assignment_id}</p>
              <p><strong>結果:</strong> {s.is_correct ? "AC" : "WA"}</p>
              <p><strong>提出時刻:</strong> {new Date(s.submitted_at).toLocaleString()}</p>
              <details>
                <summary>出力を表示</summary>
                <pre>{s.feedback}</pre>
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
