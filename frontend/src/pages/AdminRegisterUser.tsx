import React, { useState } from "react";

const AdminRegisterUser: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = () => {
    fetch("http://localhost:5050/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, is_admin: isAdmin }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("登録失敗");
        return res.json();
      })
      .then(() => {
        setMessage("ユーザーを登録しました");
        setUsername("");
        setPassword("");
        setIsAdmin(false);
      })
      .catch(() => setMessage("登録に失敗しました"));
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>ユーザー登録</h1>
      {message && <p>{message}</p>}
      <div>
        <label>ユーザー名：</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div>
        <label>パスワード：</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          管理者
        </label>
      </div>
      <button onClick={handleRegister}>登録</button>
    </div>
  );
};

export default AdminRegisterUser;
