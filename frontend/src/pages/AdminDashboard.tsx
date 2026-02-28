import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints, API_BASE_URL } from "../config/api";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";

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
  pending: number;
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

interface MaterialProgressDetail {
  material_id: number;
  title: string;
  completed: number;
  total: number;
}

interface User {
  id: number;
  username: string;
  last_name?: string;
  first_name?: string;
  furigana?: string;
  class_name?: string;
  role?: "student" | "teacher" | "admin";
  is_admin?: number;
}

const AdminDashboard: React.FC = () => {
  const { authFetch } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);

  const getUserDisplayName = (user: User) => {
    if (user.last_name && user.first_name) {
      return `${user.last_name} ${user.first_name}`;
    }
    return user.username;
  };
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [unsubmittedUsers, setUnsubmittedUsers] = useState<UnsubmittedUser[]>([]);
  const [classes, setClasses] = useState<Array<{id:number; name:string}>>([]);
  const [selectedClass, setSelectedClass] = useState<number | "">("");
  const [classProgress, setClassProgress] = useState<Array<{class_id:number; name:string; members:number; submissions:number; correct:number; accuracy:number}>>([]);
  const [adminMessage, setAdminMessage] = useState<string>("");
  const [adminError, setAdminError] = useState<string>("");
  const [unassignedUsers, setUnassignedUsers] = useState<User[]>([]);
  const [classUsers, setClassUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<{id:number; username:string} | null>(null);
  const [selectedUserMaterials, setSelectedUserMaterials] = useState<MaterialProgressDetail[]>([]);
  const [selectedUserData, setSelectedUserData] = useState<ProgressData | null>(null);
  const [filterUserId, setFilterUserId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [daysPeriod, setDaysPeriod] = useState<7 | 30 | 90 | "all">(30); // 日別提出数の表示期間
  const [chartWidth, setChartWidth] = useState(600); // グラフの幅

  const isStudent = (u: { role?: string; is_admin?: number | boolean }) => (u.role ? u.role === "student" : !u.is_admin);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch(apiEndpoints.progress)
        .then(async (res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((d) => {
          console.log('Admin Progress API Response (全体):', d);
          if (d && !d.error) setData(d);
        })
        .catch((err) => console.error('Failed to fetch progress:', err)),
      authFetch(apiEndpoints.userProgress)
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then((d) => setUserProgress(d))
        .catch((err) => console.error('Failed to fetch userProgress:', err)),
      authFetch(apiEndpoints.unsubmitted)
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then((d) => setUnsubmittedUsers(d))
        .catch((err) => console.error('Failed to fetch unsubmitted:', err)),
      authFetch(apiEndpoints.classes)
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then((d) => setClasses(d))
        .catch((err) => console.error('Failed to fetch classes:', err)),
      authFetch(`${apiEndpoints.classes}/progress`)
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then((d) => setClassProgress(d))
        .catch((err) => console.error('Failed to fetch class progress:', err)),
      authFetch(apiEndpoints.classesUnassigned)
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then((d) => setUnassignedUsers(d.filter((u: any) => isStudent(u))))
        .catch((err) => console.error('Failed to fetch unassigned users:', err)),
      authFetch(`${API_BASE_URL}/api/users`)
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then((d) => setAllUsers(d.filter((u: any) => isStudent(u))))
        .catch((err) => console.error('Failed to fetch all users:', err)),
    ]).finally(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => {
    // フィルタリングの優先順位: ユーザー > クラス > 全体
    if (filterUserId) {
      // ユーザーで絞り込み
      const user = allUsers.find(u => u.id === filterUserId);
      if (user) {
        loadUserProgressDetail(user.id, user.username);
      }
    } else if (selectedClass) {
      // クラス全体で絞り込み
      authFetch(`${apiEndpoints.classes}/${selectedClass}/progress`)
        .then(async (res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((d) => {
          if (d && !d.error) setData(d);
        })
        .catch((err) => console.error('Failed to fetch class progress:', err));
      authFetch(`${apiEndpoints.classes}/${selectedClass}/user_progress`)
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then((d) => setUserProgress(d))
        .catch((err) => console.error('Failed to fetch class user progress:', err));
      authFetch(`${apiEndpoints.classes}/${selectedClass}/users`)
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then((d) => setClassUsers(d.filter((u: any) => isStudent(u))))
        .catch((err) => console.error('Failed to fetch class users:', err));
      setSelectedUser(null);
      setSelectedUserMaterials([]);
      setSelectedUserData(null);
    } else {
      // 全体表示
      authFetch(apiEndpoints.progress)
        .then(async (res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((d) => {
          if (d && !d.error) setData(d);
        })
        .catch((err) => console.error('Failed to fetch progress:', err));
      authFetch(apiEndpoints.userProgress)
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then((d) => setUserProgress(d))
        .catch((err) => console.error('Failed to fetch user progress:', err));
      setClassUsers([]);
      setSelectedUser(null);
      setSelectedUserMaterials([]);
      setSelectedUserData(null);
    }
  }, [selectedClass, filterUserId, authFetch]);

  const loadUserProgressDetail = (uid: number, username: string) => {
    authFetch(`${apiEndpoints.progress}?user_id=${uid}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((d) => {
        if (d && !d.error) {
          setSelectedUser({ id: uid, username });
          setSelectedUserMaterials(d?.material_progress || []);
          setSelectedUserData(d); // ユーザーの全データを保存
        }
      })
      .catch((err) => console.error('Failed to load user progress:', err));
  };

  const handleResetContent = async () => {
    setShowResetDialog(false);
    setAdminMessage("");
    setAdminError("");
    try {
      const res = await authFetch(`${API_BASE_URL}/api/admin/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'content' })
      });
      if (!res.ok) throw new Error('リセットに失敗しました');
      setAdminMessage('コンテンツを初期化しました');
      // データをリフレッシュ
      window.location.reload();
    } catch (e: any) {
      setAdminError((e.message || 'リセットに失敗しました'));
    }
  };

  if (!data) return (
    <div className="page-container">
      <div className="loading">
        <div className="spinner"></div>
        <p>データを読み込み中...</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="page-container">
      <div className="loading">
        <div className="spinner"></div>
        <p>ダッシュボードを準備中...</p>
      </div>
    </div>
  );

  // ユーザーが選択されている場合はそのユーザーのデータ、そうでなければクラスまたは全体データ
  const displayData = selectedUser && selectedUserData ? selectedUserData : data;
  const displayTitle = selectedUser 
    ? `${selectedUser.username} さんの進捗` 
    : selectedClass 
      ? `クラス「${classes.find(c => c.id === selectedClass)?.name || ""}」の進捗`
      : "システム全体の進捗";

  // ユーザードロップダウンの選択肢を動的に生成
  const availableUsers = selectedClass 
    ? classUsers 
    : allUsers;

  const currentViewType = filterUserId 
    ? "ユーザー別" 
    : selectedClass 
      ? "クラス全体" 
      : "システム全体";

  const pieData = [
    { name: "正解", value: displayData.correct },
    { name: "不正解", value: displayData.incorrect },
    { name: "採点待ち", value: displayData.pending },
    { name: "未提出", value: displayData.unsubmitted },
  ];

  const colors = ["#82ca9d", "#ef4444", "#f59e0b", "#ccc"];

  return (
    <div className="page-container">
      <PageHeader
        title="管理者ダッシュボード"
        subtitle={filterUserId 
          ? `${getUserDisplayName(allUsers.find(u => u.id === filterUserId)!)} さんの個別データを表示しています` 
          : selectedClass 
            ? `クラス「${classes.find(c => c.id === selectedClass)?.name || ""}」全体のデータを表示しています` 
            : "システム全体の状況を確認できます"}
        breadcrumbs={[{ label: "管理" }, { label: "ダッシュボード" }]}
      />
      
      {adminMessage && <div className="message message-success">{adminMessage}</div>}
      {adminError && <div className="message message-error">{adminError}</div>}
      
      {/* クラス選択とユーザー表示 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-title" style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>表示設定</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600' }}>クラスで絞り込み</label>
              <select 
                className="form-select"
                value={selectedClass}
                onChange={(e)=>{
                  setSelectedClass(e.target.value? Number(e.target.value): "");
                  setFilterUserId(""); // クラス変更時はユーザーフィルタをリセット
                }}
              >
                <option value="">全体表示</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {selectedClass && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                  選択中: {classes.find(c => c.id === selectedClass)?.name}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600' }}>ユーザーで絞り込み</label>
              <select 
                className="form-select"
                value={filterUserId}
                onChange={(e)=>setFilterUserId(e.target.value? Number(e.target.value): "")}
                disabled={availableUsers.length === 0}
              >
                <option value="">
                  {selectedClass ? "クラス全体を表示" : "全ユーザー表示"}
                </option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {getUserDisplayName(u)}
                    {!selectedClass && u.class_name ? ` (${u.class_name})` : ''}
                  </option>
                ))}
              </select>
              {filterUserId && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                  選択中: {getUserDisplayName(availableUsers.find(u => u.id === filterUserId)!)}
                </p>
              )}
            </div>
          </div>

          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            backgroundColor: '#e0e7ff', 
            borderRadius: '0.5rem',
            borderLeft: '3px solid #3b82f6'
          }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--primary)' }}>現在の表示: {currentViewType}</strong>
              <div style={{ marginTop: '0.3rem', fontSize: '0.85rem' }}>
                {filterUserId 
                  ? `${availableUsers.find(u => u.id === filterUserId)?.username} さんの個別データを表示中`
                  : selectedClass 
                    ? `「${classes.find(c => c.id === selectedClass)?.name}」クラス全体のデータを表示中`
                    : "システム全体のデータを表示中"}
              </div>
            </div>
          </div>
        </div>
        
        <div className="card" style={{ display: 'none' }}>
          <div className="card-title">管理操作</div>
          <p style={{ color: "var(--text-secondary)", fontSize: '13px', margin: '0 0 1rem 0' }}>
            すべてのコンテンツを削除します
          </p>
          <button 
            className="btn btn-danger" 
            style={{ width: '100%' }}
            onClick={() => setShowResetDialog(true)}
          >
            コンテンツを初期化
          </button>
        </div>
      </div>
      
      {/* 統計グラフ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-title" style={{ borderBottom: '2px solid #82ca9d', paddingBottom: '0.5rem', color: '#82ca9d' }}>
            提出状況
            {filterUserId && <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>({availableUsers.find(u => u.id === filterUserId)?.username})</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
            <PieChart width={280} height={280}>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }} />
            </PieChart>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '0.5rem', color: '#3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              日別提出数
              {filterUserId && <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>({availableUsers.find(u => u.id === filterUserId)?.username})</span>}
            </div>
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
          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', overflowX: 'auto' }}>
            <BarChart 
              width={chartWidth} 
              height={280} 
              data={(() => {
                const allDailyCounts = displayData.daily_counts || [];
                
                // 期間に応じて集計単位を変更
                if (daysPeriod === 7 || daysPeriod === 30) {
                  // 7日間、30日間は日別表示
                  return allDailyCounts.slice(-daysPeriod);
                } else if (daysPeriod === 90) {
                  // 90日間は週別集計
                  const recentData = allDailyCounts.slice(-90);
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
                    weeklyData[weekKey].correct += (item as any).correct || 0;
                    weeklyData[weekKey].incorrect += (item as any).incorrect || 0;
                    weeklyData[weekKey].pending += (item as any).pending || 0;
                  });
                  
                  return Object.entries(weeklyData)
                    .map(([date, data]) => ({ date: date + ' (週)', ...data }))
                    .sort((a, b) => a.date.localeCompare(b.date));
                } else {
                  // 全期間は月別集計
                  const monthlyData: { [key: string]: { correct: number; incorrect: number; pending: number; } } = {};
                  
                  allDailyCounts.forEach(item => {
                    const monthKey = item.date.substring(0, 7); // YYYY-MM
                    
                    if (!monthlyData[monthKey]) {
                      monthlyData[monthKey] = { correct: 0, incorrect: 0, pending: 0 };
                    }
                    monthlyData[monthKey].correct += (item as any).correct || 0;
                    monthlyData[monthKey].incorrect += (item as any).incorrect || 0;
                    monthlyData[monthKey].pending += (item as any).pending || 0;
                  });
                  
                  return Object.entries(monthlyData)
                    .map(([date, data]) => ({ date: date + ' (月)', ...data }))
                    .sort((a, b) => a.date.localeCompare(b.date));
                }
              })()}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                angle={daysPeriod === 'all' ? -45 : 0}
                textAnchor={daysPeriod === 'all' ? 'end' : 'middle'}
                height={daysPeriod === 'all' ? 80 : 30}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
                labelStyle={{ color: '#1f2937' }}
                formatter={(value: number) => value}
              />
              <Legend wrapperStyle={{ fontSize: '13px', color: '#6b7280' }} />
              <Bar dataKey="correct" stackId="a" fill="#82ca9d" name="正解" />
              <Bar dataKey="incorrect" stackId="a" fill="#f87171" name="不正解" />
              <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="採点待ち" />
            </BarChart>
          </div>
        </div>
      </div>
      {/* 教材別進捗 */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title" style={{ borderBottom: '2px solid #82ca9d', paddingBottom: '0.5rem', color: '#82ca9d' }}>
          教材別進捗
          {filterUserId && <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>({availableUsers.find(u => u.id === filterUserId)?.username})</span>}
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {displayData.material_progress.length === 0 ? (
            <EmptyState title="教材の進捗データがありません" />
          ) : (
            displayData.material_progress.map((m) => (
              <div key={m.material_id} style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '500' }}>{m.title}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {m.completed} / {m.total} 完了
                  </span>
                </div>
                <div style={{ background: "#e5e7eb", width: "100%", height: "12px", borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${m.total ? (m.completed / m.total) * 100 : 0}%`,
                      background: "linear-gradient(90deg, #82ca9d, #5da583)",
                      height: "100%",
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={showResetDialog}
        title="コンテンツを初期化します"
        message="すべての教材、レッスン、宿題、テストケース、提出データが削除されます。ユーザーとクラス情報は保持されます。この操作は取り消せません。"
        confirmText="初期化する"
        cancelText="キャンセル"
        isDangerous={true}
        onConfirm={handleResetContent}
        onCancel={() => setShowResetDialog(false)}
      />
    </div>
  );
};

export default AdminDashboard;
