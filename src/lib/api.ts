import { clearAuthStorage, getStoredToken } from "./auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { auth = true, headers, ...rest } = options;

  const token = getStoredToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    clearAuthStorage();

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return response;
}