import { apiEndpoints, API_BASE_URL } from "./api";

/**
 * API エンドポイントへの完全な URL を取得
 * @param endpoint 相対パス (例: "/assignments", "assignments/1")
 * @returns 完全な URL
 */
export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}/api${cleanEndpoint}`;
};

/**
 * authFetch の代わりに使用する、トークン付き fetch
 */
export const fetchWithAuth = async (
  endpoint: string,
  options?: RequestInit & { token?: string }
) => {
  const { token, ...fetchOptions } = options || {};
  const headers = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(getApiUrl(endpoint), {
    ...fetchOptions,
    headers,
  });
};
