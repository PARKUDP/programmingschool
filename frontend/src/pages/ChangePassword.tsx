import React, { useState } from "react";
import PageHeader from "../components/PageHeader";
import { useSnackbar } from "../components/SnackbarContext";
import { useAuth } from "../context/AuthContext";

const ChangePassword: React.FC = () => {
  const { changePassword } = useAuth();
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const oldValid = oldPass.length > 0;
  const newValid = newPass.length >= 8;
  const matchValid = newPass === confirmPass;

  const { showSnackbar } = useSnackbar();
  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!oldPass || !newPass || !confirmPass) {
      setError("すべてのフィールドを入力してください");
      return;
    }

    if (newPass !== confirmPass) {
      setError("新しいパスワードが一致しません");
      return;
    }

    if (newPass.length < 8) {
      setError("新しいパスワードは8文字以上である必要があります");
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPass, newPass);
      setMessage("パスワードを変更しました");
      showSnackbar("パスワードを変更しました", "success");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err: any) {
      setError(err.message || "パスワード変更に失敗しました");
      showSnackbar("パスワード変更に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="パスワード変更"
        subtitle="アカウントのパスワードを変更します"
        breadcrumbs={[{ label: "設定" }, { label: "パスワード変更" }]}
      />

      <div className="card" style={{ maxWidth: "500px" }}>
        {message && <div className="message message-success">{message}</div>}
        {error && <div className="message message-error">{error}</div>}

        <div className="form-section">
          <div className="form-group">
            <label className="form-label">現在のパスワード</label>
            <input
              className="form-input"
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              placeholder="現在のパスワードを入力"
              disabled={loading}
              aria-invalid={!oldValid}
              aria-describedby="old-help"
            />
            <span id="old-help" className="help-text">現在のパスワードを入力してください</span>
          </div>

          <div className="form-group">
            <label className="form-label">新しいパスワード</label>
            <input
              className="form-input"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="新しいパスワードを入力"
              disabled={loading}
              aria-invalid={!newValid}
              aria-describedby="new-help"
            />
            <span id="new-help" className="help-text">8文字以上、英数字を含めると安全です</span>
            {!newValid && <div className="message message-error" style={{ marginTop: '.5rem' }}>新しいパスワードは8文字以上です</div>}
          </div>

          <div className="form-group">
            <label className="form-label">新しいパスワード（確認）</label>
            <input
              className="form-input"
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="新しいパスワードを再度入力"
              disabled={loading}
              aria-invalid={!matchValid}
              aria-describedby="confirm-help"
            />
            <span id="confirm-help" className="help-text">新しいパスワードと同じ内容を入力</span>
            {!matchValid && <div className="message message-error" style={{ marginTop: '.5rem' }}>新しいパスワードが一致しません</div>}
          </div>

          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !oldValid || !newValid || !matchValid}>
            {loading ? "変更中..." : "パスワードを変更"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
