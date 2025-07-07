import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProblemList from "./pages/ProblemList";
import ProblemDetail from "./pages/ProblemDetail";
import SubmissionHistory from "./pages/SubmissionHistory";
import Login from "./pages/Login";
import AdminMaterialList from "./pages/AdminMaterialList";
import AdminLessonList from "./pages/AdminLessonList";
import AdminRegisterUser from "./pages/AdminRegisterUser";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AssignmentList from "./pages/AssignmentList";
import AdminCreateAssignment from "./pages/AdminCreateAssignment";
import ChangePassword from "./pages/ChangePassword";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProblemList />} />
        <Route path="/assignments/:id" element={<ProblemDetail />} />
        <Route path="/submissions" element={<SubmissionHistory />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/assignments" element={<AssignmentList />} />
        <Route path="/admin/assignments/create" element={<AdminCreateAssignment />} />
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/materials" element={<AdminMaterialList />} />
        <Route path="/admin/materials/:materialId/lessons" element={<AdminLessonList />} />
        <Route path="/admin/users/register" element={<AdminRegisterUser />} />
      </Routes>
    </Router>
  );
}

export default App;
