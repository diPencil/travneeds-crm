import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { NotificationsResponse } from '../../../shared/notifications/notifications.contracts';
import { apiRequest } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { NotificationsContext } from './NotificationsContext';

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <NotificationsStore key={user?.id ?? 'signed-out'} signedIn={Boolean(user)}>
      {children}
    </NotificationsStore>
  );
}

function NotificationsStore({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  const { csrfToken } = useAuth();
  const [data, setData] = useState<NotificationsResponse>({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(signedIn);
  const [failed, setFailed] = useState(false);
  const refresh = useCallback(() => {
    if (!signedIn) return Promise.resolve();
    return apiRequest<NotificationsResponse>('/notifications')
      .then((result) => {
        setData(result);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [signedIn]);
  useEffect(() => {
    void refresh();
    if (!signedIn) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh, signedIn]);

  const write = async (path: string, method: 'POST' | 'DELETE') => {
    await apiRequest<void>(path, {
      method,
      body: method === 'POST' ? {} : undefined,
      csrfToken: csrfToken ?? undefined,
    });
    await refresh();
  };
  return (
    <NotificationsContext.Provider
      value={{
        ...data,
        loading,
        failed,
        refresh,
        markAllAsRead: () => write('/notifications/read-all', 'POST'),
        markAsRead: (id) => write(`/notifications/${id}/read`, 'POST'),
        remove: (id) => write(`/notifications/${id}`, 'DELETE'),
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
