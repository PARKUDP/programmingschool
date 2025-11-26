import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import AdminCreateProblem from "./pages/AdminCreateProblem";
import AdminCreateTestCase from "./pages/AdminCreateTestCase";
import AdminAssignmentList from "./pages/AdminAssignmentList";
import AdminProblemList from "./pages/AdminProblemList";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Navbar />
      <div style={{ minHeight: "calc(100vh - 70px)", background: "linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)" }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={user ? <ProblemList /> : <Navigate to="/login" />}
          />
          <Route
            path="/assignments/:id"
            element={user ? <ProblemDetail /> : <Navigate to="/login" />}
          />
          <Route
            path="/submissions"
            element={user ? <SubmissionHistory /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard"
            element={user ? <StudentDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/dashboard"
            element={user && user.is_admin ? <AdminDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/assignments"
            element={user ? <AssignmentList /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/assignments/create"
            element={user && user.is_admin ? <AdminCreateAssignment /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/assignments/:assignmentId/testcases/create"
            element={user && user.is_admin ? <AdminCreateTestCase /> : <Navigate to="/login" />}
          />
          <Route
            path="/change-password"
            element={user ? <ChangePassword /> : <Navigate to="/login" />}
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />
          <Route
            path="/admin/materials"
            element={user && user.is_admin ? <AdminMaterialList /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/materials/:materialId/lessons"
            element={user && user.is_admin ? <AdminLessonList /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/assignments"
            element={user && user.is_admin ? <AdminAssignmentList /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/lessons/:lessonId/problems"
            element={user && user.is_admin ? <AdminProblemList /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/problems/create"
            element={user && user.is_admin ? <AdminCreateProblem /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/users/register"
            element={user && user.is_admin ? <AdminRegisterUser /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
