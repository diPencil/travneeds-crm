export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  csrfToken: string;
}
