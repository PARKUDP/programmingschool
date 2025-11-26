import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";

const AdminRegisterUser: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, authFetch } = useAuth();

  if (!user) return <div className="page-container"><p className="message message-error">ログインしてください</p></div>;
  if (!user.is_admin) return <div className="page-container"><p className="message message-error">権限がありません</p></div>;

  const handleRegister = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await authFetch(apiEndpoints.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, is_admin: isAdmin }),
      });
      if (!res.ok) throw new Error("登録失敗");
      await res.json();
      setMessage("ユーザーを登録しました");
      setUsername("");
      setPassword("");
      setIsAdmin(false);
    } catch (err: any) {
      setError(err.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">👤 ユーザー登録</h1>
        <p className="page-subtitle">新しいユーザーを登録します</p>
      </div>

      <div className="card" style={{ maxWidth: "500px" }}>
        {message && <div className="message message-success">✅ {message}</div>}
        {error && <div className="message message-error">⚠️ {error}</div>}

        <div className="form-section">
          <div className="form-group">
            <label className="form-label">ユーザー名</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ユーザー名を入力"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">パスワード</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: "var(--text-primary)", fontWeight: "500" }}>
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                disabled={loading}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              管理者権限を付与
            </label>
          </div>

          <button className="btn btn-primary" onClick={handleRegister} disabled={loading}>
            {loading ? "登録中..." : "ユーザーを登録"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRegisterUser;
