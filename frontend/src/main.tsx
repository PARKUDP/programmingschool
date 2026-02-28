import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/common.css";
import { AuthProvider } from "./context/AuthContext";

// キャンセルエラーを無視するグローバルハンドラー（開発時のノイズ削減）
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.type === 'cancelation' || event.reason?.name === 'AbortError') {
    // React DevTools や StrictMode によるキャンセルエラーを無視
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
