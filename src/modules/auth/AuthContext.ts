import { createContext } from 'react';
import type { AuthUser } from '../../../shared/auth/auth.contracts';

export interface AuthContextValue {
  user: AuthUser | null;
  csrfToken: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
