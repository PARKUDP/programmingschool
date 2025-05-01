import React, { useEffect, useState } from "react";

type Lesson = {
  id: number;
  title: string;
};

const AdminCreateProblem = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);

  useEffect(() => {
    fetch("http://localhost:5001/api/lessons")
      .then((res) => res.json())
      .then((data) => setLessons(data));
  }, []);

  const handleCreateProblem = () => {
    if (!selectedLessonId) return;

    fetch("http://localhost:5001/api/problems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "足し算問題",
        markdown: "2つの整数を読み込んで合計を出力してください。",
        lesson_id: selectedLessonId
      }),
    });
  };

  return (
    <div>
      <h1>問題作成</h1>
      <select onChange={(e) => setSelectedLessonId(Number(e.target.value))}>
        <option value="">レッスンを選択してください</option>
        {lessons.map((lesson) => (
          <option key={lesson.id} value={lesson.id}>
            {lesson.title}
          </option>
        ))}
      </select>

      <button onClick={handleCreateProblem}>作成</button>
    </div>
  );
};

export default AdminCreateProblem;
