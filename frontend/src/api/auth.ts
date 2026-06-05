import type { AuthResponse, ProfileUpdate, RegisterResponse, User } from "./auth-types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

const TOKEN_KEY = "blog_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string | { msg: string }[] };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
        message = body.detail[0].msg;
      }
    } catch {
      // ignore
    }
    throw new Error(message || "请求失败");
  }
  return res.json() as Promise<T>;
}

export async function registerUser(payload: {
  username: string;
  password: string;
  email?: string;
}): Promise<RegisterResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<RegisterResponse>(res);
}

export async function loginUser(payload: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<AuthResponse>(res);
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<User>(res);
}

export async function updateProfile(token: string, payload: ProfileUpdate): Promise<User> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return parseJson<User>(res);
}

export async function changePassword(
  token: string,
  payload: { old_password: string; new_password: string },
): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return parseJson<{ message: string }>(res);
}

export async function uploadAvatar(token: string, file: File): Promise<User> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/auth/me/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return parseJson<User>(res);
}

export function getGithubLoginUrl(): string {
  return `${BASE_URL}/auth/github`;
}
