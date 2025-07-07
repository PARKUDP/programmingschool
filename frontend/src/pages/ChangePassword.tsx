import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const ChangePassword: React.FC = () => {
  const { changePassword } = useAuth();
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");
    setMessage("");
    changePassword(oldPass, newPass)
      .then(() => {
        setMessage("パスワードを変更しました");
        setOldPass("");
        setNewPass("");
      })
      .catch((e) => setError(e.message));
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>パスワード変更</h1>
      {message && <p>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ marginBottom: "1rem" }}>
        <label>現在のパスワード：</label>
        <input
          type="password"
          value={oldPass}
          onChange={(e) => setOldPass(e.target.value)}
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
      <button onClick={handleSubmit}>変更</button>
    </div>
  );
};

export default ChangePassword;
