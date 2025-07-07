import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useAuth } from "../context/AuthContext";

interface DailyCount {
  date: string;
  count: number;
}

interface MaterialProgress {
  material_id: number;
  title: string;
  completed: number;
  total: number;
}

interface ProgressData {
  total_assignments: number;
  correct: number;
  incorrect: number;
  unsubmitted: number;
  daily_counts: DailyCount[];
  material_progress: MaterialProgress[];
}

interface UserProgress {
  user_id: number;
  username: string;
  submissions: number;
  correct: number;
  accuracy: number;
}

interface UnsubmittedUser {
  id: number;
  username: string;
}

const AdminDashboard: React.FC = () => {
  const { authFetch } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [unsubmittedUsers, setUnsubmittedUsers] = useState<UnsubmittedUser[]>([]);

  useEffect(() => {
    authFetch("http://localhost:5050/api/progress")
      .then((res) => res.json())
      .then((d) => setData(d));
    authFetch("http://localhost:5050/api/user_progress")
      .then((res) => res.json())
      .then((d) => setUserProgress(d));
    authFetch("http://localhost:5050/api/unsubmitted")
      .then((res) => res.json())
      .then((d) => setUnsubmittedUsers(d));
  }, []);

  if (!data) return <p>読み込み中...</p>;

  const pieData = [
    { name: "正解", value: data.correct },
    { name: "不正解", value: data.incorrect },
    { name: "未提出", value: data.unsubmitted },
  ];

  const colors = ["#82ca9d", "#8884d8", "#ccc"];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>管理者ダッシュボード</h1>
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        <PieChart width={300} height={300}>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
            {pieData.map((entry, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>

        <BarChart width={500} height={300} data={data.daily_counts}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      </div>

      <h2>教材別進捗</h2>
      <ul>
        {data.material_progress.map((m) => (
          <li key={m.material_id} style={{ marginBottom: "0.5rem" }}>
            <div>{m.title}</div>
            <div style={{ background: "#eee", width: "100%", height: "20px" }}>
              <div
                style={{
                  width: `${m.total ? (m.completed / m.total) * 100 : 0}%`,
                  background: "#82ca9d",
                  height: "100%",
                }}
              />
            </div>
            <small>
              {m.completed}/{m.total}
            </small>
          </li>
        ))}
      </ul>

      <h2>成績一覧</h2>
      <table border="1" cellPadding="4" style={{ borderCollapse: "collapse", marginBottom: "1rem" }}>
        <thead>
          <tr>
            <th>ユーザー名</th>
            <th>提出数</th>
            <th>正解数</th>
            <th>正解率(%)</th>
          </tr>
        </thead>
        <tbody>
          {userProgress.map((u) => (
            <tr key={u.user_id}>
              <td>{u.username}</td>
              <td>{u.submissions}</td>
              <td>{u.correct}</td>
              <td>{u.accuracy}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>未提出者一覧</h2>
      <table border="1" cellPadding="4" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ユーザーID</th>
            <th>ユーザー名</th>
          </tr>
        </thead>
        <tbody>
          {unsubmittedUsers.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
