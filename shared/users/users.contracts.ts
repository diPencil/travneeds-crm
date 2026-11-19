import type { AuthUser, UserRole } from '../auth/auth.contracts.js';
import type { SystemAuditEvent } from '../audit/audit.contracts.js';

export interface ManagedUser extends AuthUser {
  status: 'active' | 'disabled';
  jobTitle: string | null;
  lastLoginAt: string | null;
  version: number;
  activeSessions: number;
}
export interface UserDirectory {
  users: ManagedUser[];
  metrics: { total: number; activeSessions: number; admins: number; pendingInvites: number };
}
export interface UserDetails {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  role: UserRole;
  avatarGender: 'male' | 'female';
  status: 'active' | 'disabled';
  dateOfBirth: string;
  nationality: string;
  gender: 'male' | 'female' | 'unspecified';
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyRelationship: string;
}

export interface PersonalInformation {
  dateOfBirth: string | null;
  nationality: string | null;
  gender: 'male' | 'female' | 'unspecified';
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyRelationship: string | null;
}
export interface UserDetail {
  user: ManagedUser;
  personal: PersonalInformation;
  security: {
    twoFactorEnabled: false;
    sessions: {
      createdAt: string;
      expiresAt: string;
      userAgent: string | null;
      isCurrent: boolean;
    }[];
  };
  permissions: string[];
  activity: SystemAuditEvent[];
  performance: {
    assignedLeads: number;
    convertedLeads: number;
    assignedCustomers: number;
    recordedEvents: number;
  };
}
export interface Invitation {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}
