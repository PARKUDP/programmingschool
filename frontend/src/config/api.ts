// バックエンド API のベース URL
// ブラウザから実行する場合は localhost:5050
// Docker コンテナから実行する場合は http://backend:5050 を使用
const getApiBaseUrl = (): string => {
  // 開発環境では localhost を使用
  // ブラウザから直接アクセスする場合
  if (typeof window !== "undefined") {
    return "http://localhost:5050";
  }
  // サーバーサイドレンダリングの場合はバックエンドを直接参照
  return "http://backend:5050";
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
  submit: `${API_BASE_URL}/api/submit`,
  submissions: `${API_BASE_URL}/api/submissions`,
  progress: `${API_BASE_URL}/api/progress`,
  unsubmitted: `${API_BASE_URL}/api/unsubmitted`,
  userProgress: `${API_BASE_URL}/api/user_progress`,
  users: `${API_BASE_URL}/api/users`,
  classes: `${API_BASE_URL}/api/classes`,
  classesUnassigned: `${API_BASE_URL}/api/classes/unassigned`,
  problemChoices: `${API_BASE_URL}/api/problems`,
  essaySubmissions: `${API_BASE_URL}/api/essay-submissions`,
};
