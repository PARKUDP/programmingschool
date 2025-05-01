import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminMaterialList: React.FC = () => {
  const [materials, setMaterials] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5001/api/materials")
      .then((res) => res.json())
      .then((data) => setMaterials(data));
  }, []);

  const handleCreate = () => {
    fetch("http://localhost:5001/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    })
      .then((res) => res.json())
      .then(() => {
        setNewTitle("");
        return fetch("http://localhost:5001/api/materials");
      })
      .then((res) => res.json())
      .then((data) => setMaterials(data));
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
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminMaterialList;
