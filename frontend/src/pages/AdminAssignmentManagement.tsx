import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import PageHeader from "../components/PageHeader";
import { useSnackbar } from "../components/SnackbarContext";

interface Assignment {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  question_text: string;
  created_at: string;
}

interface ClassItem {
  id: number;
  name: string;
}

interface UserItem {
  id: number;
  username: string;
  role?: "student" | "teacher" | "admin";
  is_admin?: number;
}

interface Target {
  target_type: string;
  target_id: number | null;
}

const AdminAssignmentManagement: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user, authFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const isStaff = user?.is_admin || user?.role === "teacher";
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [targetType, setTargetType] = useState<"all" | "users" | "classes">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isStaff || !assignmentId) return;
    loadData();
  }, [isStaff, assignmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, cRes, uRes, tRes] = await Promise.all([
        authFetch(`${apiEndpoints.assignments}`),
        authFetch(apiEndpoints.classes),
        authFetch(apiEndpoints.users),
        authFetch(`${apiEndpoints.assignments}/${assignmentId}/targets`),
      ]);
      const [aData, cData, uData, tData] = await Promise.all([
        aRes.json(),
        cRes.json(),
        uRes.json(),
        tRes.json(),
      ]);
      
      const isStudent = (u: UserItem) => (u.role ? u.role === "student" : !u.is_admin);

      const foundAssignment = (aData || []).find((a: Assignment) => a.id === Number(assignmentId));
      setAssignment(foundAssignment || null);
      setClasses(cData || []);
      setUsers((uData || []).filter((u: UserItem) => isStudent(u)));
      
      const targets: Target[] = tData.targets || [];
      if (targets.length === 0 || targets[0].target_type === "all") {
        setTargetType("all");
        setSelectedIds([]);
      } else if (targets[0].target_type === "user") {
        setTargetType("users");
        setSelectedIds(targets.map((t) => t.target_id!).filter((id) => id !== null));
      } else if (targets[0].target_type === "class") {
        setTargetType("classes");
        setSelectedIds(targets.map((t) => t.target_id!).filter((id) => id !== null));
      }
    } catch (e: any) {
      setError("データ取得に失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTargets = async () => {
    if (!assignmentId) return;
    try {
      const res = await authFetch(`${apiEndpoints.assignments}/${assignmentId}/targets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_ids: targetType === "all" ? [] : selectedIds,
        }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      showSnackbar("割り当て先を更新しました", "success");
      navigate("/admin/assignments");
    } catch (e: any) {
      setError((e.message || "更新に失敗しました"));
      showSnackbar("更新に失敗しました", "error");
    }
  };

  if (!isStaff) {
    return (
      <div className="page-container">
        <p className="message message-error">権限がありません</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="page-container">
        <p className="message message-error">宿題が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="宿題割り当て管理"
        subtitle={`「${assignment.title}」の割り当て先を設定します`}
        breadcrumbs={[{ label: "管理" }, { label: "宿題", to: "/admin/assignments" }, { label: "割り当て" }]}
      />

      {error && <div className="message message-error">{error}</div>}

      <div className="card">
        <div className="card-title">割り当て先の設定</div>
        <div className="form-section">
          <div className="form-group">
            <label className="form-label">割り当て対象</label>
            <select
              className="form-select"
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value as "all" | "users" | "classes");
                setSelectedIds([]);
              }}
            >
              <option value="all">全員</option>
              <option value="users">特定のユーザー</option>
              <option value="classes">特定のクラス</option>
            </select>
          </div>

          {targetType === "users" && (
            <div className="form-group">
              <label className="form-label">ユーザーを選択（複数選択可）</label>
              <select
                multiple
                className="form-select"
                style={{ minHeight: "200px" }}
                value={selectedIds.map(String)}
                onChange={(e) => {
                  const ids = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                  setSelectedIds(ids);
                }}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
              <span className="help-text">Ctrl/Cmd + クリックで複数選択</span>
            </div>
          )}

          {targetType === "classes" && (
            <div className="form-group">
              <label className="form-label">クラスを選択（複数選択可）</label>
              <select
                multiple
                className="form-select"
                style={{ minHeight: "200px" }}
                value={selectedIds.map(String)}
                onChange={(e) => {
                  const ids = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                  setSelectedIds(ids);
                }}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="help-text">Ctrl/Cmd + クリックで複数選択</span>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/admin/assignments")}
            >
              キャンセル
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpdateTargets}
              style={{ flex: 1 }}
            >
              割り当てを更新
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAssignmentManagement;
