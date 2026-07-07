const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

/* ================= ACCESS ================= */

export const setAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_KEY, token);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_KEY);
};

/* ================= REFRESH ================= */

export const setRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_KEY, token);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_KEY);
};

/* ================= CLEAR ================= */

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};
