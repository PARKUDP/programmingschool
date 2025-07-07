import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const ResetPassword: React.FC = () => {
  const { authFetch } = useAuth();
  const [userId, setUserId] = useState("");
  const [newPass, setNewPass] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setMessage("");
    setError("");
    authFetch("http://localhost:5050/api/reset_password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: Number(userId),
        new_password: newPass,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("reset failed");
        return res.json();
      })
      .then(() => {
        setMessage("パスワードをリセットしました");
        setUserId("");
        setNewPass("");
      })
      .catch(() => setError("リセットに失敗しました"));
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>パスワードリセット</h1>
      {message && <p>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ marginBottom: "1rem" }}>
        <label>ユーザーID：</label>
        <input
          type="number"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label>新しいパスワード：</label>
        <input
          type="password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        />
      </div>
      <button onClick={handleSubmit}>リセット</button>
    </div>
  );
};

export default ResetPassword;
