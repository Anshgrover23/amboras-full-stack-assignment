import type { SessionUser } from "./types";

const USER_KEY = "amboras_user";

function parseJwtPayload(token: string): Partial<SessionUser> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const p = JSON.parse(atob(padded)) as {
      sub?: string;
      email?: string;
      store_id?: string;
    };
    if (!p.store_id || !p.email) return null;
    return {
      id: p.sub ?? "",
      email: p.email,
      store_id: p.store_id,
    };
  } catch {
    return null;
  }
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      /* fall through */
    }
  }
  const token = localStorage.getItem("token");
  if (!token) return null;
  const fromJwt = parseJwtPayload(token);
  return fromJwt as SessionUser | null;
}

export function setStoredUser(user: SessionUser | null): void {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}
