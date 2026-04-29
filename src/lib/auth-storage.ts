const TOKEN_KEY = "CSI_Legal_token";
const USER_KEY = "CSI_Legal_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser(data: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(data));
}

export function removeStoredUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

export function clearAuthStorage() {
  removeStoredToken();
  removeStoredUser();
}