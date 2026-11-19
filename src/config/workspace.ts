import type { TranslationKey } from '../localization/messages';

export interface WorkspaceSection {
  id: string;
  href: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  adminOnly?: boolean;
}

export const workspaceSections: WorkspaceSection[] = [
  {
    id: 'emails',
    href: '/emails',
    titleKey: 'nav.emails',
    descriptionKey: 'workspace.emailsDescription',
  },
  {
    id: 'inbox',
    href: '/inbox',
    titleKey: 'nav.inbox',
    descriptionKey: 'workspace.inboxDescription',
  },
  {
    id: 'bookings',
    href: '/bookings',
    titleKey: 'nav.bookings',
    descriptionKey: 'workspace.bookingsDescription',
  },
  {
    id: 'quotations',
    href: '/quotations',
    titleKey: 'nav.quotations',
    descriptionKey: 'workspace.quotationsDescription',
  },
  {
    id: 'leads',
    href: '/leads',
    titleKey: 'nav.leads',
    descriptionKey: 'workspace.leadsDescription',
  },
  {
    id: 'customers',
    href: '/customers',
    titleKey: 'nav.customers',
    descriptionKey: 'workspace.customersDescription',
  },
  {
    id: 'suppliers',
    href: '/suppliers',
    titleKey: 'nav.suppliers',
    descriptionKey: 'workspace.suppliersDescription',
  },
  {
    id: 'finance',
    adminOnly: true,
    href: '/finance',
    titleKey: 'nav.finance',
    descriptionKey: 'workspace.financeDescription',
  },
  {
    id: 'users',
    href: '/users',
    titleKey: 'nav.userManagement',
    descriptionKey: 'workspace.usersDescription',
    adminOnly: true,
  },
  {
    id: 'settings',
    href: '/settings',
    titleKey: 'nav.settings',
    descriptionKey: 'workspace.settingsDescription',
    adminOnly: true,
  },
];
