import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminMaterialList: React.FC = () => {
  const [materials, setMaterials] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch("http://localhost:5050/api/materials")
      .then((res) => res.json())
      .then((data) => setMaterials(data));
  }, []);

  const handleCreate = () => {
    authFetch("http://localhost:5050/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    })
      .then((res) => res.json())
      .then(() => {
        setNewTitle("");
        return authFetch("http://localhost:5050/api/materials");
      })
      .then((res) => res.json())
      .then((data) => setMaterials(data));
  };

  const refresh = () => {
    fetch("http://localhost:5050/api/materials")
      .then((res) => res.json())
      .then((data) => setMaterials(data));
  };

  const handleEdit = (id: number, currentTitle: string) => {
    const title = prompt("新しいタイトル", currentTitle);
    if (!title) return;
    fetch(`http://localhost:5050/api/materials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then(refresh);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("削除しますか？")) return;
    fetch(`http://localhost:5050/api/materials/${id}`, {
      method: "DELETE",
    }).then(refresh);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>教材一覧</h1>
      <input
        type="text"
        placeholder="新しい教材名"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
      />
      <button onClick={handleCreate}>教材を追加</button>
      <ul>
        {materials.map((m: any) => (
          <li key={m.id}>
            <button onClick={() => navigate(`/admin/materials/${m.id}/lessons`)}>
              {m.title}
            </button>
            <button onClick={() => handleEdit(m.id, m.title)} style={{ marginLeft: "0.5rem" }}>
              編集
            </button>
            <button onClick={() => handleDelete(m.id)} style={{ marginLeft: "0.5rem" }}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminMaterialList;
