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
  const [daysPeriod, setDaysPeriod] = useState<7 | 30 | 90 | "all">(30); // 日別提出状況の表示期間
  const [chartWidth, setChartWidth] = useState(800); // グラフの幅

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
        console.log('Progress API Response:', d);
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, authFetch]);

  if (!user) return <div style={{ padding: "2rem" }}>ログインしてください</div>;
  if (loading) return <div style={{ padding: "2rem" }}>読み込み中...</div>;
  if (!data) return <div style={{ padding: "2rem" }}>データを取得できませんでした</div>;

  console.log('Dashboard Data:', {
    correct: data.correct,
    incorrect: data.incorrect,
    pending: data.pending,
    unsubmitted: data.unsubmitted,
    total_assignments: data.total_assignments
  });

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1a202c", margin: 0 }}>
              日別提出状況
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${daysPeriod === 7 ? 'btn-primary' : ''}`}
                onClick={() => setDaysPeriod(7)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
              >
                7日間
              </button>
              <button
                className={`btn ${daysPeriod === 30 ? 'btn-primary' : ''}`}
                onClick={() => setDaysPeriod(30)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
              >
                30日間
              </button>
              <button
                className={`btn ${daysPeriod === 90 ? 'btn-primary' : ''}`}
                onClick={() => setDaysPeriod(90)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
              >
                90日間(週別)
              </button>
              <button
                className={`btn ${daysPeriod === 'all' ? 'btn-primary' : ''}`}
                onClick={() => setDaysPeriod('all')}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
              >
                全期間(月別)
              </button>
            </div>
          </div>
          <div style={{ padding: '1rem 0', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#6b7280', minWidth: '80px' }}>グラフ幅:</label>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>狭い</span>
              <input
                type="range"
                min="400"
                max="1200"
                step="50"
                value={chartWidth}
                onChange={(e) => setChartWidth(Number(e.target.value))}
                style={{ flex: 1, maxWidth: '300px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>広い</span>
            </div>
          </div>
          <div style={{ width: "100%", height: "300px", overflowX: 'auto' }}>
            <div style={{ width: chartWidth, height: '100%' }}>
              <ResponsiveContainer>
                <BarChart 
                  data={(() => {
                    // 期間に応じて集計単位を変更
                    if (daysPeriod === 7 || daysPeriod === 30) {
                      // 7日間、30日間は日別表示
                      return chartData.slice(-daysPeriod);
                    } else if (daysPeriod === 90) {
                      // 90日間は週別集計
                      const recentData = chartData.slice(-90);
                      const weeklyData: { [key: string]: { correct: number; incorrect: number; pending: number; } } = {};
                      
                      recentData.forEach(item => {
                        const date = new Date(item.date);
                        // 週の開始日（月曜日）を取得
                        const day = date.getDay();
                        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                        const monday = new Date(date.setDate(diff));
                        const weekKey = monday.toISOString().split('T')[0];
                        
                        if (!weeklyData[weekKey]) {
                          weeklyData[weekKey] = { correct: 0, incorrect: 0, pending: 0 };
                        }
                        weeklyData[weekKey].correct += item.correct || 0;
                        weeklyData[weekKey].incorrect += item.incorrect || 0;
                        weeklyData[weekKey].pending += item.pending || 0;
                      });
                      
                      return Object.entries(weeklyData)
                        .map(([date, data]) => ({ date: date + ' (週)', ...data }))
                        .sort((a, b) => a.date.localeCompare(b.date));
                    } else {
                      // 全期間は月別集計
                      const monthlyData: { [key: string]: { correct: number; incorrect: number; pending: number; } } = {};
                      
                      chartData.forEach(item => {
                        const monthKey = item.date.substring(0, 7); // YYYY-MM
                        
                        if (!monthlyData[monthKey]) {
                          monthlyData[monthKey] = { correct: 0, incorrect: 0, pending: 0 };
                        }
                        monthlyData[monthKey].correct += item.correct || 0;
                        monthlyData[monthKey].incorrect += item.incorrect || 0;
                        monthlyData[monthKey].pending += item.pending || 0;
                      });
                      
                      return Object.entries(monthlyData)
                        .map(([date, data]) => ({ date: date + ' (月)', ...data }))
                        .sort((a, b) => a.date.localeCompare(b.date));
                    }
                  })()} 
                  margin={{ top: 20, right: 30, left: 20, bottom: daysPeriod === 'all' ? 60 : 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date"
                    angle={daysPeriod === 'all' ? -45 : 0}
                    textAnchor={daysPeriod === 'all' ? 'end' : 'middle'}
                    height={daysPeriod === 'all' ? 80 : 30}
                  />
                  <YAxis />
                  <Tooltip formatter={(value: number) => value} />
                  <Legend />
                  <Bar dataKey="correct" name="正解" stackId="a" fill="#10b981" />
                  <Bar dataKey="incorrect" name="不正解" stackId="a" fill="#ef4444" />
                  <Bar dataKey="pending" name="採点待ち" stackId="a" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
