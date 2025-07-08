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

interface LessonProgress {
  lesson_id: number;
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
  lesson_progress: LessonProgress[];
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:5050/api/progress?user_id=${user.id}`)
      .then((res) => res.json())
      .then((d) => setData(d));
  }, [user]);

  if (!user) return <p>ログインしてください</p>;
  if (!data) return <p>読み込み中...</p>;

  const pieData = [
    { name: "正解", value: data.correct },
    { name: "不正解", value: data.incorrect },
    { name: "未提出", value: data.unsubmitted },
  ];

  const colors = ["#82ca9d", "#8884d8", "#ccc"];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>ダッシュボード</h1>
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

      <h2>レッスン別進捗</h2>
      <ul>
        {data.lesson_progress.map((l) => (
          <li key={l.lesson_id} style={{ marginBottom: "0.5rem" }}>
            <div>{l.title}</div>
            <div style={{ background: "#eee", width: "100%", height: "20px" }}>
              <div
                style={{
                  width: `${l.total ? (l.completed / l.total) * 100 : 0}%`,
                  background: "#82ca9d",
                  height: "100%",
                }}
              />
            </div>
            <small>
              {l.completed}/{l.total}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StudentDashboard;
