import type { TranslationKey } from '../../localization/messages';

const labels: Record<string, TranslationKey> = {
  'quotations.saved': 'audit.quotationSaved',
  'quotations.ready': 'audit.quotationReady',
  'quotations.sent': 'audit.quotationSent',
  'quotations.accepted': 'audit.quotationAccepted',
  'quotations.declined': 'audit.quotationDeclined',
  'quotations.draft': 'audit.quotationDrafted',
  'bookings.created': 'audit.bookingCreated',
  'bookings.confirmed': 'audit.bookingConfirmed',
  'bookings.completed': 'audit.bookingCompleted',
  'bookings.cancelled': 'audit.bookingCancelled',
  'catalogue.created': 'audit.catalogueCreated',
  'catalogue.updated': 'audit.catalogueUpdated',
  'users.created': 'audit.userCreated',
  'users.updated': 'audit.userUpdated',
  'users.invited': 'audit.userInvited',
  'users.invitation_accepted': 'audit.inviteAccepted',
  'users.invitation_revoked': 'audit.inviteRevoked',
  'users.sessions_revoked': 'audit.sessionsRevoked',
  'leads.saved': 'audit.leadSaved',
  'leads.converted': 'audit.leadConverted',
  'leads.archived': 'audit.leadArchived',
  'leads.restored': 'audit.leadRestored',
  'customers.saved': 'audit.customerSaved',
  'customers.created_from_lead': 'audit.customerConverted',
  'customers.archived': 'audit.customerArchived',
  'customers.restored': 'audit.customerRestored',
  'suppliers.saved': 'audit.supplierSaved',
  'suppliers.archived': 'audit.supplierArchived',
  'suppliers.restored': 'audit.supplierRestored',
  'auth.login': 'audit.login',
  'auth.login_failed': 'audit.loginFailed',
  'users.message_sent': 'audit.messageSent',
  'auth.logout': 'audit.logout',
  'admin.bootstrap': 'audit.accountCreated',
  'settings.updated': 'audit.settingsUpdated',
  'account.profile_updated': 'audit.profileUpdated',
};

export function auditLabel(action: string, t: (key: TranslationKey) => string): string {
  return labels[action] ? t(labels[action]) : action.replace(/[._]/g, ' ');
}
