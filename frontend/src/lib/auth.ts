import type { LoginResult } from "../types";
import { readErrorMessage } from "./api";

const BASE = import.meta.env.VITE_API_BASE_URL as string;

function decodeBase64Url(raw: string): string {
  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return atob(`${normalized}${padding}`);
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const data = (await res.json()) as LoginResult;
  localStorage.setItem("token", data.access_token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}

export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

export function getCurrentUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = JSON.parse(decodeBase64Url(parts[1])) as { sub?: unknown };
    if (typeof payload.sub !== "string" || !payload.sub.trim()) return null;

    return payload.sub;
  } catch {
    return null;
  }
}
