import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`${apiEndpoints.progress}?user_id=${user.id}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  if (!user) return <div style={{ padding: "2rem" }}>ログインしてください</div>;
  if (loading) return <div style={{ padding: "2rem" }}>読み込み中...</div>;
  if (!data) return <div style={{ padding: "2rem" }}>データを取得できませんでした</div>;

  const pieData = [
    { name: "正解", value: data.correct },
    { name: "不正解", value: data.incorrect },
    { name: "未提出", value: data.unsubmitted },
  ];

  const colors = ["#10b981", "#f59e0b", "#ef4444"];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "#1a202c", margin: "0 0 0.5rem 0" }}>
          📊 学習ダッシュボード
        </h1>
        <p style={{ color: "#718096", margin: "0" }}>
          あなたの学習進捗を確認しましょう
        </p>
      </div>

      {/* サマリーカード */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            borderLeft: "4px solid #10b981",
          }}
        >
          <div style={{ color: "#718096", fontSize: "12px", fontWeight: "600", marginBottom: "0.5rem" }}>
            正解数
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#10b981" }}>
            {data.correct}
          </div>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            borderLeft: "4px solid #f59e0b",
          }}
        >
          <div style={{ color: "#718096", fontSize: "12px", fontWeight: "600", marginBottom: "0.5rem" }}>
            不正解数
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>
            {data.incorrect}
          </div>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            borderLeft: "4px solid #ef4444",
          }}
        >
          <div style={{ color: "#718096", fontSize: "12px", fontWeight: "600", marginBottom: "0.5rem" }}>
            未提出数
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ef4444" }}>
            {data.unsubmitted}
          </div>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            borderLeft: "4px solid #3b82f6",
          }}
        >
          <div style={{ color: "#718096", fontSize: "12px", fontWeight: "600", marginBottom: "0.5rem" }}>
            総課題数
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#3b82f6" }}>
            {data.total_assignments}
          </div>
        </div>
      </div>

      {/* グラフ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "2rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1a202c", margin: "0 0 1rem 0" }}>
            提出状況
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1a202c", margin: "0 0 1rem 0" }}>
            日別提出数
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.daily_counts || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#a0aec0" />
              <YAxis stroke="#a0aec0" />
              <Tooltip />
              <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 進捗バー */}
      {data.material_progress && data.material_progress.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            marginBottom: "2rem",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1a202c", margin: "0 0 1.5rem 0" }}>
            📚 教材別進捗
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {data.material_progress.map((m) => {
              const percentage = m.total ? (m.completed / m.total) * 100 : 0;
              return (
                <div key={m.material_id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#2d3748", fontSize: "14px" }}>
                      {m.title}
                    </span>
                    <span style={{ color: "#718096", fontSize: "12px" }}>
                      {m.completed}/{m.total}
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#e2e8f0",
                      width: "100%",
                      height: "12px",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                        height: "100%",
                        transition: "width 0.3s ease",
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.lesson_progress && data.lesson_progress.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1a202c", margin: "0 0 1.5rem 0" }}>
            📖 レッスン別進捗
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {data.lesson_progress.map((l) => {
              const percentage = l.total ? (l.completed / l.total) * 100 : 0;
              return (
                <div key={l.lesson_id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#2d3748", fontSize: "14px" }}>
                      {l.title}
                    </span>
                    <span style={{ color: "#718096", fontSize: "12px" }}>
                      {l.completed}/{l.total}
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#e2e8f0",
                      width: "100%",
                      height: "12px",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                        height: "100%",
                        transition: "width 0.3s ease",
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
