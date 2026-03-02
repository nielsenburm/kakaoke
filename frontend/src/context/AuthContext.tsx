import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, AuthResponse } from '../data/authApi';
import * as authApi from '../data/authApi';
import { setAuthToken, getAuthToken, setOnUnauthorized } from '../data/apiClient';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  // On mount, try to restore session from stored token
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.fetchMe()
      .then(setUser)
      .catch(() => setAuthToken(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuthResponse = useCallback((response: AuthResponse) => {
    setAuthToken(response.token);
    setUser(response.user);
  }, []);

  const loginFn = useCallback(async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    handleAuthResponse(response);
  }, [handleAuthResponse]);

  const registerFn = useCallback(async (username: string, password: string) => {
    const response = await authApi.register(username, password);
    handleAuthResponse(response);
  }, [handleAuthResponse]);

  return (
    <AuthContext.Provider value={{ user, loading, login: loginFn, register: registerFn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
