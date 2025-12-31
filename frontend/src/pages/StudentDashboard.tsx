import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

interface DailyCount {
  date: string;
  count?: number; // fallback for旧データ
  correct?: number;
  incorrect?: number;
  pending?: number;
  unsubmitted?: number;
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
  pending: number;
  unsubmitted: number;
  daily_counts: DailyCount[];
  material_progress: MaterialProgress[];
}

const StudentDashboard: React.FC = () => {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    authFetch(`${apiEndpoints.progress}?user_id=${user.id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`progress fetch failed: ${res.status}`);
        }
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, authFetch]);

  if (!user) return <div style={{ padding: "2rem" }}>ログインしてください</div>;
  if (loading) return <div style={{ padding: "2rem" }}>読み込み中...</div>;
  if (!data) return <div style={{ padding: "2rem" }}>データを取得できませんでした</div>;

  const pieData = [
    { name: "正解", value: data.correct },
    { name: "不正解", value: data.incorrect },
    { name: "採点待ち", value: data.pending },
    { name: "未提出", value: data.unsubmitted },
  ];

  const colors = ["#10b981", "#ef4444", "#f59e0b", "#9ca3af"];

  const hasDaily = (data.daily_counts || []).length > 0;

  const toNum = (v: number | string | undefined | null) => Number(v ?? 0);

  const baseDailyData = (hasDaily ? data.daily_counts : []).map((d) => ({
    date: d.date,
    correct: toNum(d.correct),
    incorrect: toNum(d.incorrect),
    pending: toNum(d.pending),
    unsubmitted: toNum(d.unsubmitted),
    total: d.count !== undefined ? toNum(d.count) : toNum(d.correct) + toNum(d.incorrect) + toNum(d.pending) + toNum(d.unsubmitted),
  }));

  const hasPositiveDaily = baseDailyData.some(
    (d) => d.total > 0 || d.correct > 0 || d.incorrect > 0 || d.pending > 0 || d.unsubmitted > 0
  );

  const fallbackRow = {
    date: "合計",
    correct: toNum(data.correct),
    incorrect: toNum(data.incorrect),
    pending: toNum(data.pending),
    unsubmitted: toNum(data.unsubmitted),
    total: toNum(data.correct) + toNum(data.incorrect) + toNum(data.pending) + toNum(data.unsubmitted),
  };

  const stackedDailyData = hasPositiveDaily ? baseDailyData : [fallbackRow];

  const hasStatusValues = stackedDailyData.some(
    (d) => d.correct > 0 || d.incorrect > 0 || d.pending > 0 || d.unsubmitted > 0
  );

  const chartData = hasStatusValues
    ? stackedDailyData
    : stackedDailyData.map((d) => ({ date: d.date, total: d.total }));

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "#1a202c", margin: "0 0 0.5rem 0" }}>
          学習ダッシュボード
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
            borderLeft: "4px solid #ef4444",
          }}
        >
          <div style={{ color: "#718096", fontSize: "12px", fontWeight: "600", marginBottom: "0.5rem" }}>
            不正解数
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ef4444" }}>
            {data.incorrect}
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
            採点待ち
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>
            {data.pending}
          </div>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            borderLeft: "4px solid #9ca3af",
          }}
        >
          <div style={{ color: "#718096", fontSize: "12px", fontWeight: "600", marginBottom: "0.5rem" }}>
            未提出数
          </div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#9ca3af" }}>
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
            日別提出状況
          </h3>
          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="correct" name="正解" stackId="a" fill="#10b981" />
                <Bar dataKey="incorrect" name="不正解" stackId="a" fill="#ef4444" />
                <Bar dataKey="pending" name="採点待ち" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
            教材別進捗
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
    </div>
  );
};

export default StudentDashboard;
