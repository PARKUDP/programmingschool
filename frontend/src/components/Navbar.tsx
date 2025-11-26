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
        <Link to={user.is_admin ? "/admin/dashboard" : "/dashboard"} className="navbar-brand">
          <span className="brand-icon">📚</span>
          Kidz8
        </Link>
        
        <button className="navbar-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-menu ${isOpen ? "active" : ""}`}>
          <div className="navbar-links">
            {user.is_admin ? (
              <>
                <Link to="/admin/dashboard" className="nav-link">
                  <span className="icon">📊</span> ダッシュボード
                </Link>
                <Link to="/admin/materials" className="nav-link">
                  <span className="icon">📖</span> 教材管理
                </Link>
                <Link to="/admin/assignments" className="nav-link">
                  <span className="icon">📋</span> 宿題管理
                </Link>
                <Link to="/admin/users/register" className="nav-link">
                  <span className="icon">👤</span> ユーザー登録
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="nav-link">
                  <span className="icon">📊</span> ダッシュボード
                </Link>
                <Link to="/" className="nav-link">
                  <span className="icon">📝</span> 課題一覧
                </Link>
                <Link to="/submissions" className="nav-link">
                  <span className="icon">✅</span> 提出履歴
                </Link>
              </>
            )}
          </div>

          <div className="navbar-user">
            <div className="user-info">
              <span className="user-badge">👤 {user.username}</span>
              {user.is_admin && <span className="admin-badge">管理者</span>}
            </div>
            <Link to="/change-password" className="nav-link secondary">
              🔐 パスワード変更
            </Link>
            <button onClick={handleLogout} className="nav-logout">
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
