import React, { useState, useEffect } from 'react';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('student'); 

  useEffect(() => {
    const fetchData = async () => {
      const userRes = await fetch('/api/admin/user');
      const materialRes = await fetch('/api/admin/material');
      setUsers(await userRes.json());
      setMaterials(await materialRes.json());
    };
    fetchData();
  }, []);

  const assignMaterial = async () => {
    await fetch('/api/admin/user/assign_material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser, material_id: selectedMaterial }),
    });
  };

  const createUser = async () => {
    await fetch('/api/admin/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      }),
    });
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('student');
    alert('新しいユーザーが作成されました');
  };

  return (
    <div>
      <h1>管理者パネル</h1>
      <div>
        <h2>教材を割り当て</h2>
        <select onChange={(e) => setSelectedUser(e.target.value)} value={selectedUser}>
          <option value="">ユーザーを選択</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <select onChange={(e) => setSelectedMaterial(e.target.value)} value={selectedMaterial}>
          <option value="">教材を選択</option>
          {materials.map((material) => (
            <option key={material.id} value={material.id}>
              {material.title}
            </option>
          ))}
        </select>
        <button onClick={assignMaterial}>教材を割り当て</button>
      </div>
      <div>
        <h2>新しいユーザーを作成</h2>
        <input
          type="text"
          placeholder="ユーザー名"
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
        />
        <input
          type="email"
          placeholder="メールアドレス"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="パスワード"
          value={newUserPassword}
          onChange={(e) => setNewUserPassword(e.target.value)}
        />
        <select onChange={(e) => setNewUserRole(e.target.value)} value={newUserRole}>
          <option value="student">生徒</option>
          <option value="teacher">先生</option>
        </select>
        <button onClick={createUser}>ユーザーを作成</button>
      </div>
    </div>
  );
};

export default AdminPanel;
