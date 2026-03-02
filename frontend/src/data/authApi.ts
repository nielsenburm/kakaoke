import { apiFetch, getApiBase } from './apiClient';

export interface User {
  id: number;
  username: string;
  admin: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${getApiBase()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Registration failed' }));
    throw new Error(err.message ?? `Registration failed: ${res.status}`);
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${getApiBase()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(err.message ?? `Login failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchMe(): Promise<User> {
  const res = await apiFetch('/api/auth/me');
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}
