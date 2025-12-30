import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProblemList from "./pages/ProblemList";
import ProblemDetail from "./pages/ProblemDetail";
import ProblemSolve from "./pages/ProblemSolve";
import SubmissionHistory from "./pages/SubmissionHistory";
import Login from "./pages/Login";
import AdminMaterialList from "./pages/AdminMaterialList";
import AdminLessonList from "./pages/AdminLessonList";
import AdminRegisterUser from "./pages/AdminRegisterUser";
import AdminUserManagement from "./pages/AdminUserManagement";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AssignmentList from "./pages/AssignmentList";
import AdminCreateAssignment from "./pages/AdminCreateAssignment";
import AdminCreateProblem from "./pages/AdminCreateProblem";
import AdminCreateTestCase from "./pages/AdminCreateTestCase";
import AdminAssignmentList from "./pages/AdminAssignmentList";
import AdminProblemList from "./pages/AdminProblemList";
import AdminAssignmentManagement from "./pages/AdminAssignmentManagement";
import GradingPanel from "./pages/GradingPanel";
import ChangePassword from "./pages/ChangePassword";
import Navbar from "./components/Navbar";
import { SnackbarProvider } from "./components/SnackbarContext";
import { useAuth } from "./context/AuthContext";

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <SnackbarProvider>
        <Navbar />
        <div style={{ minHeight: "calc(100vh - 70px)", background: "#ffffff" }}>
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
            element={user && (user.is_admin || user.role === "teacher") ? <AdminCreateAssignment /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/assignments/:assignmentId/testcases/create"
            element={user && (user.is_admin || user.role === "teacher") ? <AdminCreateTestCase /> : <Navigate to="/login" />}
          />
          <Route
            path="/change-password"
            element={user ? <ChangePassword /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/materials"
            element={user && (user.is_admin || user.role === "teacher") ? <AdminMaterialList /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/materials/:materialId/lessons"
            element={user && (user.is_admin || user.role === "teacher") ? <AdminLessonList /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/assignments"
            element={user && (user.is_admin || user.role === "teacher") ? <AdminAssignmentList /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/lessons/:lessonId/problems"
            element={user && (user.is_admin || user.role === "teacher") ? <AdminProblemList /> : <Navigate to="/login" />}
          />
          <Route
            path="/problems/:problemId/solve"
            element={user ? <ProblemSolve /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/problems/create"
            element={user && (user.is_admin || user.role === "teacher") ? <AdminCreateProblem /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/grading"
            element={user && (user.is_admin || user.role === "teacher") ? <GradingPanel /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/users/register"
            element={user && user.is_admin ? <AdminRegisterUser /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/users"
            element={user && user.is_admin ? <AdminUserManagement /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/classes"
            element={user && user.is_admin ? <AdminUserManagement /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/assignments/:assignmentId/manage"
            element={user && (user.is_admin || user.role === "teacher") ? <AdminAssignmentManagement /> : <Navigate to="/login" />}
          />
          </Routes>
        </div>
      </SnackbarProvider>
    </Router>
  );
}

export default App;
