import { createContext } from 'react';
import type { NotificationRecord } from '../../../shared/notifications/notifications.contracts';

export interface NotificationsContextValue {
  notifications: NotificationRecord[];
  unreadCount: number;
  loading: boolean;
  failed: boolean;
  refresh: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}
export const NotificationsContext = createContext<NotificationsContextValue | null>(null);
