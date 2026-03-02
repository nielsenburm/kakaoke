const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('kakaoke-token', token);
  } else {
    localStorage.removeItem('kakaoke-token');
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  authToken = localStorage.getItem('kakaoke-token');
  return authToken;
}

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

export function getApiBase(): string {
  return API_BASE;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    setAuthToken(null);
    onUnauthorized?.();
  }

  return res;
}
