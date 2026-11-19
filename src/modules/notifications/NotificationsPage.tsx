import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Bell, MessageSquare, AlertCircle, Check, Trash2, Filter } from 'lucide-react';
import { Button } from '../../components/ui/Button';

import { useNotifications } from './useNotifications';
import { useToastContext } from '../../hooks/useToastContext';
import { useLocale } from '../../localization/useLocale';
import { formatDateTime } from '../../utils/format';
import { UserAvatar } from '../../components/ui/UserAvatar';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    loading,
    failed,
    refresh,
    markAllAsRead: markAllStored,
    markAsRead,
    remove,
  } = useNotifications();
  const { t } = useLocale();
  const toast = useToastContext();
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');

  const filteredNotifications = notifications.filter((n) => filter === 'All' || n.isUnread);

  const markAllAsRead = async () => {
    try {
      await markAllStored();
    } catch {
      toast.error(t('settings.failed'));
    }
  };
  const deleteNotification = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await remove(id);
    } catch {
      toast.error(t('settings.failed'));
    }
  };
  const readNotification = async (id: string) => {
    try {
      await markAsRead(id);
    } catch {
      toast.error(t('settings.failed'));
    }
  };

  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-600 text-white p-6 sm:p-8 rounded-3xl shadow-lg shadow-blue-500/20">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t('header.notifications')}
            </h1>
            <p className="mt-1 text-sm text-blue-100 opacity-90">
              {t('notifications.description')}
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Button
              onClick={() => {
                void markAllAsRead();
              }}
              disabled={loading || !notifications.some((item) => item.isUnread)}
              className="bg-white text-blue-600 hover:bg-gray-50 rounded-xl font-bold border-0 shadow-sm"
            >
              <Check className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('header.markAllAsRead')}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('All')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === 'All' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
              >
                {t('header.all')}
              </button>
              <button
                onClick={() => setFilter('Unread')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === 'Unread' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
              >
                {t('header.unread')}
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex"
              onClick={() => setFilter((value) => (value === 'All' ? 'Unread' : 'All'))}
            >
              <Filter size={16} className="mr-2" />
              {t('notifications.filter')}
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <p role="status" className="py-20 text-center">
                {t('common.loading')}
              </p>
            ) : failed ? (
              <div role="alert" className="py-20 text-center">
                <p>{t('settings.failed')}</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    void refresh();
                  }}
                >
                  {t('common.retry')}
                </Button>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start p-6 transition-colors ${notification.isUnread ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                  >
                    <div className="relative flex-shrink-0 me-4">
                      <UserAvatar
                        alt={notification.user ?? t('header.notifications')}
                        className="w-12 h-12 rounded-full border border-gray-100 dark:border-gray-800"
                      />
                      {notification.type === 'comment' && (
                        <div className="absolute -bottom-1 -end-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center p-0.5">
                          <MessageSquare size={10} className="text-white" />
                        </div>
                      )}
                      {notification.type === 'system' && (
                        <div className="absolute -bottom-1 -end-1 bg-blue-500 w-6 h-6 rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center p-0.5">
                          <Bell size={10} className="text-white" />
                        </div>
                      )}
                      {notification.type === 'alert' && (
                        <div className="absolute -bottom-1 -end-1 bg-red-500 w-6 h-6 rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center p-0.5">
                          <AlertCircle size={10} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pe-4">
                      <p className="text-base text-gray-900 dark:text-gray-100">
                        <span className="font-bold text-gray-900 dark:text-white me-1.5">
                          {notification.user}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          {notification.content}
                        </span>
                      </p>
                      <p
                        className={`text-sm font-medium mt-1.5 ${notification.isUnread ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                      >
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      {notification.isUnread && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500 shadow-sm mb-2"></div>
                      )}
                      <button
                        aria-label={t('notifications.markRead')}
                        title={t('notifications.markRead')}
                        onClick={() => {
                          void readNotification(notification.id);
                        }}
                        disabled={!notification.isUnread}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 disabled:opacity-40"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        aria-label={t('notifications.delete')}
                        onClick={(e) => {
                          void deleteNotification(notification.id, e);
                        }}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Bell size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {t('notifications.caughtUp')}
                </h3>
                <p className="text-sm">
                  {filter === 'Unread'
                    ? t('header.noUnreadNotifications')
                    : t('header.noNotifications')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
