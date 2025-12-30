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
  const usernameValid = username.trim().length >= 3;
  const passwordValid = password.length >= 8;
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSubmitAttempted(true);

    // 入力が明らかに不正の場合はサーバー通信を行わずに案内のみ
    if (!usernameValid || !passwordValid) {
      setLoading(false);
      return;
    }

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
          role: data.role || (data.is_admin ? "admin" : "student"),
        },
        data.token
      );
      const role = data.role || (data.is_admin ? "admin" : "student");
      navigate(role === "admin" ? "/admin/dashboard" : "/dashboard");
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
            <img src="/img/logo_image_01.svg" alt="Kidz8" className="login-logo" />
            <h1 className="login-title">Kidz8</h1>
            <p className="login-subtitle">プログラミング学習プラットフォーム</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">!</span>
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
                onBlur={() => setUsernameTouched(true)}
                disabled={loading}
                autoComplete="username"
                required
                aria-invalid={!usernameValid}
                aria-describedby="login-username-help"
              />
              <span id="login-username-help" className="help-text">3文字以上で入力してください</span>
              {(!usernameValid && (usernameTouched || submitAttempted)) && (
                <div className="message message-error" style={{ marginTop: '.5rem' }}>ユーザー名は3文字以上です</div>
              )}
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
                onBlur={() => setPasswordTouched(true)}
                disabled={loading}
                autoComplete="current-password"
                required
                aria-invalid={!passwordValid}
                aria-describedby="login-password-help"
              />
              <span id="login-password-help" className="help-text">8文字以上で入力してください</span>
              {(!passwordValid && (passwordTouched || submitAttempted)) && (
                <div className="message message-error" style={{ marginTop: '.5rem' }}>パスワードは8文字以上です</div>
              )}
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
                usernameValid && passwordValid ? "ログイン" : "入力を確認してください"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
