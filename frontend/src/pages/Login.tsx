import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    fetch("http://localhost:5001/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("ログイン失敗");
        return res.json();
      })
      .then((data) => {
        login({
          id: data.user_id,
          username: username,
          is_admin: data.is_admin || false, 
        });
        navigate("/"); // ログイン成功後にホームへリダイレクト
      })
      .catch(() => {
        setError("ログインに失敗しました。ユーザー名またはパスワードを確認してください。");
      });
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>ログイン</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ marginBottom: "1rem" }}>
        <label>ユーザー名：</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label>パスワード：</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button onClick={handleLogin}>ログイン</button>
    </div>
  );
};

export default Login;
