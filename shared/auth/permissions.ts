import type { UserRole } from './auth.contracts.js';

// These capabilities describe the currently enforced admin/employee policy.
// They do not represent configurable grants or additional authentication roles.
export function userPermissionCodes(roles: UserRole[]) {
  const own = [
    'dashboard.view',
    'crm.read',
    'crm.write',
    'profile.self',
    'notifications.self',
    'audit.self',
  ];
  return roles.includes('admin')
    ? [...own, 'users.manage', 'settings.manage', 'audit.system', 'crm.archive', 'finance.view']
    : own;
}
