// バックエンド API のベース URL
// - 本番: 相対パス（Caddy 経由、HTTPS 維持）
// - 開発: http://localhost:5050
// - SSR/コンテナ内: http://backend:80
const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // ブラウザアクセス時は localhost 以外なら相対パスで返す（ドメインを固定しない）
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "";
    }
    return "http://localhost:5050";
  }
  // SSR/コンテナ内
  return "http://backend:80";
};

export const API_BASE_URL = getApiBaseUrl();

export const apiEndpoints = {
  login: `${API_BASE_URL}/api/login`,
  register: `${API_BASE_URL}/api/register`,
  changePassword: `${API_BASE_URL}/api/change_password`,
  resetPassword: `${API_BASE_URL}/api/reset_password`,
  materials: `${API_BASE_URL}/api/materials`,
  lessons: `${API_BASE_URL}/api/lessons`,
  problems: `${API_BASE_URL}/api/problems`,
  assignments: `${API_BASE_URL}/api/assignments`,
  assignmentsAvailable: `${API_BASE_URL}/api/assignments/available`,
  testcases: `${API_BASE_URL}/api/testcases`,
  run: `${API_BASE_URL}/api/run`,
  runFunction: `${API_BASE_URL}/api/run_function`,
  submit: `${API_BASE_URL}/api/submit`,
  submissions: `${API_BASE_URL}/api/submissions`,
  submissionsReview: `${API_BASE_URL}/api/submissions/review`,
  progress: `${API_BASE_URL}/api/progress`,
  unsubmitted: `${API_BASE_URL}/api/unsubmitted`,
  userProgress: `${API_BASE_URL}/api/user_progress`,
  users: `${API_BASE_URL}/api/users`,
  classes: `${API_BASE_URL}/api/classes`,
  classesUnassigned: `${API_BASE_URL}/api/classes/unassigned`,
  problemChoices: `${API_BASE_URL}/api/problems`,
  essaySubmissions: `${API_BASE_URL}/api/essay-submissions`,
};
