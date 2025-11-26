import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import "./Login.css";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(apiEndpoints.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "ログインに失敗しました"
        );
      }

      const data = await response.json();
      login(
        {
          id: data.user_id,
          username: username,
          is_admin: data.is_admin || false,
        },
        data.token
      );
      navigate(data.is_admin ? "/admin/dashboard" : "/dashboard");
    } catch (err: any) {
      setError(
        err.message || "ログインに失敗しました。ユーザー名またはパスワードを確認してください。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">📚</div>
            <h1 className="login-title">Kidz8</h1>
            <p className="login-subtitle">プログラミング学習プラットフォーム</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                ユーザー名
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="ユーザー名を入力"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="footer-text">
              パスワードをお忘れですか？
              <a href="/reset-password" className="footer-link">
                リセット
              </a>
            </p>
          </div>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <h3>実践的な課題</h3>
            <p>段階的に学べるプログラミング課題</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <h3>進捗管理</h3>
            <p>学習成果をリアルタイムで追跡</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🚀</span>
            <h3>スキル向上</h3>
            <p>Python プログラミングスキル習得</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
