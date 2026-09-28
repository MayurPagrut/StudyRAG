import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/authApi';
import { setUnauthorizedHandler, tokenStore } from '../services/api';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    if (!tokenStore.get()) return;
    authApi.getCurrentUser().then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await authApi.login(email, password);
    tokenStore.set(r.token); setUser(r.user); return r.user;
  }, []);
  const register = useCallback(async (name: string, email: string, password: string) => {
    const r = await authApi.register(name, email, password);
    tokenStore.set(r.token); setUser(r.user); return r.user;
  }, []);
  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* token is discarded either way */ }
    tokenStore.clear(); setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
