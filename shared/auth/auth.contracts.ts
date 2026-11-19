export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  createdAt: string;
  phone: string | null;
  department: string | null;
  profileVersion: number;
  avatarGender: 'male' | 'female';
}

export interface AuthSession {
  user: AuthUser;
  csrfToken: string;
}
