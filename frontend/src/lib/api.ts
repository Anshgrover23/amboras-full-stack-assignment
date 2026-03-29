import type { LoginResponse, Overview, RecentEvent, TopProduct } from "./types";
import { setStoredUser } from "./session";

export { getStoredUser } from "./session";
export { setStoredUser };

function baseUrl(): string {
  const u = process.env.NEXT_PUBLIC_API_URL;
  if (!u) throw new Error("NEXT_PUBLIC_API_URL is not set");
  return u.replace(/\/$/, "");
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

/** Clears JWT and cached user profile (call on logout). */
export function clearSession(): void {
  setStoredToken(null);
  setStoredUser(null);
}

async function request<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const token = init?.token ?? getStoredToken();
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...init?.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: unknown };
      if (typeof j.message === "string") msg = j.message;
      else if (Array.isArray(j.message)) msg = j.message.join(", ");
    } catch {
      try {
        msg = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return request<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    token: null,
  });
}

export function fetchOverview() {
  return request<Overview>("/api/v1/analytics/overview");
}

export function fetchTopProducts() {
  return request<TopProduct[]>("/api/v1/analytics/top-products");
}

export function fetchRecentActivity(limit = 20) {
  const q = new URLSearchParams({ limit: String(limit) });
  return request<RecentEvent[]>(
    `/api/v1/analytics/recent-activity?${q.toString()}`,
  );
}
