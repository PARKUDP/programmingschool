import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProblemList from "./pages/ProblemList";
import ProblemDetail from "./pages/ProblemDetail";
import SubmissionHistory from "./pages/SubmissionHistory";
import Login from "./pages/Login";
import AdminCreateProblem from "./pages/AdminCreateProblem"
import AdminMaterialList from "./pages/AdminMaterialList";
import AdminLessonList from "./pages/AdminLessonList";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProblemList />} />
        <Route path="/problems/:id" element={<ProblemDetail />} />
        <Route path="/submissions" element={<SubmissionHistory />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/materials" element={<AdminMaterialList />} />
        <Route path="/admin/materials/:materialId/lessons" element={<AdminLessonList />} />
        <Route path="/admin/problems/create" element={<AdminCreateProblem />} />
      </Routes>
    </Router>
  );
}

export default App;
