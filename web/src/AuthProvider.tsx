import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from './api';
import { AuthContext, type AuthState } from './auth-context';
import type { User } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On page load, ask the server whether the cookie still belongs to a session.
  useEffect(() => {
    api<User>('/me')
      .then(setUser)
      .catch((error) => {
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error(error);
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await api<User>('/login', { method: 'POST', body: { email, password } }));
  }, []);

  const register = useCallback(
    async (email: string, displayName: string, password: string) => {
      await api('/register', { method: 'POST', body: { email, displayName, password } });
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    await api('/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
