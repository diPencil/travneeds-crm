import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuthSession, AuthUser } from '../../../shared/auth/auth.contracts';
import { ApiError, apiRequest } from '../../lib/http/api';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);

  const refresh = useCallback(() => {
    const generation = ++requestGeneration.current;
    return apiRequest<AuthSession>('/auth/session')
      .then((current) => {
        if (generation === requestGeneration.current) setSession(current);
      })
      .catch((failure) => {
        if (generation === requestGeneration.current) {
          if (failure instanceof ApiError && failure.status === 401) setSession(null);
          else setError(failure instanceof ApiError ? failure.code : 'SERVER_ERROR');
        }
      })
      .finally(() => {
        if (generation === requestGeneration.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const retry = async () => {
    setLoading(true);
    setError(null);
    await refresh();
  };

  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    ++requestGeneration.current;
    const next = await apiRequest<AuthSession>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setSession(next);
    setError(null);
    setLoading(false);
    return next.user;
  };

  const signOut = async () => {
    ++requestGeneration.current;
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST', csrfToken: session?.csrfToken });
    } catch (failure) {
      if (!(failure instanceof ApiError && failure.status === 401)) throw failure;
    }
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        csrfToken: session?.csrfToken ?? null,
        loading,
        error,
        refresh: retry,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
