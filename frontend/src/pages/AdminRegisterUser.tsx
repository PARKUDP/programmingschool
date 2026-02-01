import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiEndpoints } from "../config/api";
import { useSnackbar } from "../components/SnackbarContext";
import PageHeader from "../components/PageHeader";

const AdminRegisterUser: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [furigana, setFurigana] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, authFetch } = useAuth();
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { showSnackbar } = useSnackbar();

  if (!user) return <div className="page-container"><p className="message message-error">ログインしてください</p></div>;
  if (!user.is_admin) return <div className="page-container"><p className="message message-error">権限がありません</p></div>;

  const usernameValid = username.trim().length >= 1;
  const passwordValid = password.length >= 8;
  // 管理者以外（生徒・先生）の場合のみ氏名必須
  const requiresName = role !== "admin";
  const lastNameValid = !requiresName || lastName.trim().length >= 1;
  const firstNameValid = !requiresName || firstName.trim().length >= 1;

  const handleRegister = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    setSubmitAttempted(true);
    // 明らかな不正入力は即案内し、通信を行わない
    if (!usernameValid || !passwordValid || !lastNameValid || !firstNameValid) {
      setLoading(false);
      return;
    }
    try {
      if (!usernameValid) throw new Error("ユーザー名を入力してください");
      if (!passwordValid) throw new Error("パスワードは8文字以上で入力してください");
      if (requiresName && !lastNameValid) throw new Error("姓を入力してください");
      if (requiresName && !firstNameValid) throw new Error("名を入力してください");
      const res = await authFetch(apiEndpoints.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, last_name: lastName, first_name: firstName, furigana, role }),
      });
      if (!res.ok) throw new Error("登録失敗");
      await res.json();
      setMessage("ユーザーを登録しました");
      showSnackbar("ユーザーを登録しました", "success");
      setUsername("");
      setPassword("");
      setLastName("");
      setFirstName("");
      setFurigana("");
      setRole("student");
    } catch (err: any) {
      setError(err.message || "登録に失敗しました");
      showSnackbar("登録に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="ユーザー登録"
        subtitle="新しいユーザーを登録します"
        breadcrumbs={[{ label: "管理" }, { label: "ユーザー登録" }]}
      />

      <div className="card" style={{ maxWidth: "500px" }}>
        {message && <div className="message message-success">{message}</div>}
        {error && <div className="message message-error">{error}</div>}

        <div className="form-section">
          <div className="form-group">
            <label className="form-label">ユーザー名</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setUsernameTouched(true)}
              placeholder="ユーザー名を入力"
              disabled={loading}
              aria-invalid={!usernameValid}
              aria-describedby="username-help"
            />
            <span id="username-help" className="help-text">3文字以上、記号なしがおすすめです</span>
            {(!usernameValid && (usernameTouched || submitAttempted)) && (
              <div className="message message-error" style={{ marginTop: '.5rem' }}>ユーザー名は3文字以上で入力してください</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">ロール</label>
            <select 
              className="form-select"
              value={role}
              onChange={(e) => {
                const newRole = e.target.value as "student" | "teacher" | "admin";
                setRole(newRole);
                // 管理者を選択した場合は氏名をクリア
                if (newRole === "admin") {
                  setLastName("");
                  setFirstName("");
                  setFurigana("");
                }
              }}
              disabled={loading}
            >
              <option value="student">生徒</option>
              <option value="teacher">先生</option>
              <option value="admin">管理者</option>
            </select>
          </div>

          {requiresName && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">姓 <span style={{ color: "red" }}>*</span></label>
                  <input
                    className="form-input"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onBlur={() => setLastNameTouched(true)}
                    placeholder="姓を入力"
                    disabled={loading}
                    aria-invalid={!lastNameValid}
                  />
                  {(!lastNameValid && (lastNameTouched || submitAttempted)) && (
                    <div className="message message-error" style={{ marginTop: '.5rem' }}>姓を入力してください</div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">名 <span style={{ color: "red" }}>*</span></label>
                  <input
                    className="form-input"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onBlur={() => setFirstNameTouched(true)}
                    placeholder="名を入力"
                    disabled={loading}
                    aria-invalid={!firstNameValid}
                  />
                  {(!firstNameValid && (firstNameTouched || submitAttempted)) && (
                    <div className="message message-error" style={{ marginTop: '.5rem' }}>名を入力してください</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ふりがな（任意）</label>
                <input
                  className="form-input"
                  type="text"
                  value={furigana}
                  onChange={(e) => setFurigana(e.target.value)}
                  placeholder="ふりがなを入力"
                  disabled={loading}
                />
                <span id="name-help" className="help-text">カタカナで入力してください</span>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">パスワード</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder="パスワードを入力"
              disabled={loading}
              aria-invalid={!passwordValid}
              aria-describedby="password-help"
            />
            <span id="password-help" className="help-text">8文字以上、英数字を含めて安全に</span>
            {(!passwordValid && (passwordTouched || submitAttempted)) && (
              <div className="message message-error" style={{ marginTop: '.5rem' }}>パスワードは8文字以上で入力してください</div>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleRegister} disabled={loading || !usernameValid || !passwordValid || !lastNameValid || !firstNameValid}>
            {loading ? "登録中..." : "ユーザーを登録"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRegisterUser;
