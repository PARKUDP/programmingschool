import React, { useState, useEffect } from 'react';

const MaterialManagement: React.FC = () => {
  const [materials, setMaterials] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchMaterials = async () => {
    const response = await fetch('/api/admin/material');
    const data = await response.json();
    setMaterials(data);
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleSaveMaterial = async () => {
    await fetch('/api/admin/material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }), // descriptionを追加
    });
    setTitle('');
    setDescription('');
    fetchMaterials();
    alert('教材が保存されました');
  };

  return (
    <div>
      <h1>教材管理</h1>
      <input
        type="text"
        placeholder="教材名"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 rounded mb-4 w-full"
      />
      <textarea
        placeholder="教材の詳細 (任意)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 rounded mb-4 w-full"
        rows={4}
      />
      <button
        onClick={handleSaveMaterial}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        教材を保存
      </button>
      <div className="mt-4">
        <h2>既存の教材</h2>
        <ul>
          {materials.map((material: any) => (
            <li key={material.id} className="mb-2">
              <span>{material.title}</span>
              <a
                href={`/lessons/${material.id}`}
                className="ml-4 text-blue-500 underline"
              >
                レッスンを管理
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MaterialManagement;
