export interface NotificationRecord {
  id: string;
  type: 'comment' | 'mention' | 'system' | 'alert';
  user: string | null;
  content: string;
  createdAt: string;
  isUnread: boolean;
  href: string;
}

export interface NotificationsResponse {
  notifications: NotificationRecord[];
  unreadCount: number;
}
