import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={(user.is_admin || user.role === "teacher") ? "/admin/dashboard" : "/dashboard"} className="navbar-brand" title="ホームへ">
          <img src="/img/logo_image_01.svg" alt="Kidz8" style={{ height: "40px" }} />
        </Link>
        
        <button className="navbar-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-menu ${isOpen ? "active" : ""}`}>
          <div className="navbar-links">
            {user.role === "admin" ? (
              <>
                <Link to="/admin/dashboard" className="nav-link" title="ダッシュボード">
                  ダッシュボード
                </Link>
                <Link to="/admin/materials" className="nav-link" title="教材管理">
                  教材管理
                </Link>
                <Link to="/admin/assignments" className="nav-link" title="宿題管理">
                  宿題管理
                </Link>
                <Link to="/admin/grading" className="nav-link" title="採点">
                  採点
                </Link>
                <Link to="/admin/users" className="nav-link" title="ユーザー・クラス管理">
                  ユーザー・クラス管理
                </Link>
                <Link to="/admin/users/register" className="nav-link" title="ユーザー登録">
                  ユーザー登録
                </Link>
              </>
            ) : user.role === "teacher" ? (
              <>
                <Link to="/admin/dashboard" className="nav-link" title="ダッシュボード">
                  ダッシュボード
                </Link>
                <Link to="/admin/materials" className="nav-link" title="教材管理">
                  教材管理
                </Link>
                <Link to="/admin/assignments" className="nav-link" title="宿題管理">
                  宿題管理
                </Link>
                <Link to="/admin/grading" className="nav-link" title="採点">
                  採点
                </Link>
                <Link to="/admin/users" className="nav-link" title="ユーザー・クラス管理">
                  ユーザー・クラス管理
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="nav-link" title="ダッシュボード">
                  ダッシュボード
                </Link>
                <Link to="/" className="nav-link" title="課題一覧">
                  課題一覧
                </Link>
                <Link to="/submissions" className="nav-link" title="提出履歴">
                  提出履歴
                </Link>
              </>
            )}
          </div>

          <div className="navbar-user">
            <div className="user-info">
              <span className="user-badge">{user.username}</span>
              {user.role === "admin" && <span className="admin-badge">管理者</span>}
              {user.role === "teacher" && <span className="admin-badge" style={{ backgroundColor: "#8b5cf6" }}>先生</span>}
            </div>
            <Link to="/change-password" className="nav-link secondary" title="パスワード変更" aria-label="パスワード変更">
              パスワード変更
            </Link>
            <button onClick={handleLogout} className="nav-logout" aria-label="ログアウト">
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
