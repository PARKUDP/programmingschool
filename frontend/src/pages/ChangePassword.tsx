import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const ChangePassword: React.FC = () => {
  const { changePassword } = useAuth();
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!oldPass || !newPass || !confirmPass) {
      setError("すべてのフィールドを入力してください");
      return;
    }

    if (newPass !== confirmPass) {
      setError("新しいパスワードが一致しません");
      return;
    }

    if (newPass.length < 6) {
      setError("新しいパスワードは6文字以上である必要があります");
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPass, newPass);
      setMessage("パスワードを変更しました");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err: any) {
      setError(err.message || "パスワード変更に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🔐 パスワード変更</h1>
        <p className="page-subtitle">アカウントのパスワードを変更します</p>
      </div>

      <div className="card" style={{ maxWidth: "500px" }}>
        {message && <div className="message message-success">✅ {message}</div>}
        {error && <div className="message message-error">⚠️ {error}</div>}

        <div className="form-section">
          <div className="form-group">
            <label className="form-label">現在のパスワード</label>
            <input
              className="form-input"
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              placeholder="現在のパスワードを入力"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">新しいパスワード</label>
            <input
              className="form-input"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="新しいパスワードを入力"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">新しいパスワード（確認）</label>
            <input
              className="form-input"
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="新しいパスワードを再度入力"
              disabled={loading}
            />
          </div>

          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "変更中..." : "パスワードを変更"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
