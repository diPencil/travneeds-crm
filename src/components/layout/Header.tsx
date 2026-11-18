import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, Bell, Search, MessageSquare, AlertCircle, Check, MoreHorizontal, Settings, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { UserAvatarDropdown } from './UserAvatarDropdown';
import { useNavigate } from 'react-router-dom';
import { LOCALE_META } from '../../localization/config';
import { useLocale } from '../../localization/useLocale';
import { pickDirectionalValue } from '../../localization/direction';
import { cn } from '../../utils/cn';

interface HeaderProps {
  onMenuToggle: () => void;
}

interface HeaderNotification {
  id: number;
  type: 'comment' | 'mention' | 'system' | 'alert';
  user: string;
  avatar: string;
  content: string;
  time: string;
  isUnread: boolean;
  href: string;
}

const initialNotifications: HeaderNotification[] = [];

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { locale, direction, isRTL, switchLocale, t } = useLocale();

  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');
  const [notifications, setNotifications] = useState(initialNotifications);
  const [showOptions, setShowOptions] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        setShowOptions(false);
      }
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.isUnread).length;
  const filteredNotifications = notifications.filter(n => filter === 'All' || n.isUnread);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isUnread: false })));
  };

  const handleNotificationClick = (notification: HeaderNotification) => {
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isUnread: false } : n));
    setShowNotifications(false);
    navigate(notification.href);
  };

  return (
    <header className="sticky top-4 z-[100] mx-4 sm:mx-6 mb-6 bg-white/90 px-4 py-2 sm:py-2.5 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:bg-gray-900/90 rounded-3xl border border-white/20 dark:border-gray-800/50">
      <div className="flex items-center justify-between gap-3 lg:gap-4">
        <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
          <button
            onClick={onMenuToggle}
            aria-label={t('workspace.toggleSidebar')}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="relative flex-1 max-w-lg hidden md:block">
            <div className={pickDirectionalValue(direction, 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none', 'absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none')}>
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`${t('common.search')}...`}
              className={pickDirectionalValue(
                direction,
                'block w-full pl-10 pr-3 py-1.5 border-0 rounded-2xl leading-5 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm font-medium transition-colors',
                'block w-full pr-10 pl-3 py-1.5 border-0 rounded-2xl leading-5 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm font-medium transition-colors text-right'
              )}
            />
          </div>
        </div>

        {showMobileSearch && (
          <div className="absolute inset-0 z-50 bg-white dark:bg-gray-900 px-4 flex items-center gap-3 rounded-3xl md:hidden">
            <div className="relative flex-1">
              <div className={pickDirectionalValue(direction, 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none', 'absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none')}>
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={`${t('common.search')}...`}
                className={pickDirectionalValue(
                  direction,
                  'block w-full pl-10 pr-3 py-1.5 border-0 rounded-2xl leading-5 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm font-medium transition-colors',
                  'block w-full pr-10 pl-3 py-1.5 border-0 rounded-2xl leading-5 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm font-medium transition-colors text-right'
                )}
                autoFocus
              />
            </div>
            <button onClick={() => setShowMobileSearch(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
               <X size={20} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          <button
             className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 md:hidden"
             onClick={() => setShowMobileSearch(true)}
          >
             <Search size={20} />
          </button>

          <button
            onClick={() => switchLocale(locale === 'en' ? 'ar' : 'en')}
            className="md:hidden relative flex h-[34px] w-[60px] shrink-0 cursor-pointer items-center rounded-full bg-slate-100/80 p-1 transition-colors hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            title={t('app.language')}
            dir="ltr"
          >
            <span className="absolute left-2.5 text-[11px] font-extrabold text-gray-400">E</span>
            <span className="absolute right-2.5 text-[11px] font-extrabold text-gray-400">ع</span>

            <span
              className={cn(
                "z-10 flex h-[26px] w-[26px] transform items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 dark:bg-gray-900 text-[12px] font-extrabold text-blue-600 dark:text-blue-400",
                locale === 'ar' ? "translate-x-[26px]" : "translate-x-0"
              )}
            >
              {locale === 'en' ? 'E' : 'ع'}
            </span>
          </button>

          <div className="hidden md:flex min-w-[112px] shrink-0 items-center justify-center rounded-2xl border-0 bg-slate-100/80 p-1.5 dark:bg-gray-800 sm:min-w-[128px]">
            {(Object.keys(LOCALE_META) as Array<keyof typeof LOCALE_META>).map((localeCode) => (
              <button
                key={localeCode}
                type="button"
                onClick={() => switchLocale(localeCode)}
                aria-pressed={locale === localeCode}
                className={`min-w-0 flex-1 rounded-xl px-2 py-1.5 text-[11px] font-bold transition-all duration-300 sm:px-3 sm:py-1.5 sm:text-xs ${
                  locale === localeCode
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400 scale-105'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'
                }`}
                title={`${t('app.language')}: ${LOCALE_META[localeCode].label}`}
              >
                {LOCALE_META[localeCode].label}
              </button>
            ))}
          </div>

          <div className={pickDirectionalValue(direction, 'hidden text-right xl:block', 'hidden text-left xl:block')}>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t('app.welcomeBack')}, <span className="bidi-isolate">{user?.user_metadata?.full_name || 'Admin'}</span>!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('app.productiveDay')}</p>
          </div>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label={t('header.notifications')}
              aria-expanded={showNotifications}
              className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell size={20} className={showNotifications ? 'text-blue-600 dark:text-blue-500' : ''} />
              {unreadCount > 0 && (
                <span className={pickDirectionalValue(direction, 'absolute top-1.5 right-1.5 flex h-2.5 w-2.5', 'absolute top-1.5 left-1.5 flex h-2.5 w-2.5')}>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white dark:border-gray-900"></span>
                </span>
              )}
            </button>

            {showNotifications && (
              <div className={cn(
                "fixed top-20 inset-x-4 sm:absolute sm:top-auto sm:inset-x-auto sm:mt-2 z-50 overflow-hidden transition-all",
                "w-auto sm:w-96 rounded-2xl sm:rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800",
                "bg-white dark:bg-[#242526]",
                "ltr:sm:right-0 rtl:sm:left-0 ltr:sm:origin-top-right rtl:sm:origin-top-left"
              )}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[20px] font-bold text-gray-900 dark:text-white leading-none">{t('header.notifications')}</h3>
                    <div className="flex gap-2 relative">
                      <button onClick={markAllAsRead} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title={t('header.markAllAsRead')}>
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => setShowOptions(!showOptions)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                        title={t('common.actions')}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {showOptions && (
                        <div ref={optionsRef} className={cn(
                          "absolute top-full mt-1 w-56 bg-white dark:bg-[#242526] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50",
                          "ltr:right-0 rtl:left-0"
                        )}>
                          <button
                            onClick={() => { markAllAsRead(); setShowOptions(false); }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                          >
                            <Check size={18} className={pickDirectionalValue(direction, 'mr-3 text-gray-400', 'ml-3 text-gray-400')} />
                            <span className="font-medium">{t('header.markAllAsRead')}</span>
                          </button>
                          <button
                            onClick={() => { setShowOptions(false); setShowNotifications(false); navigate('/settings'); }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <Settings size={18} className={pickDirectionalValue(direction, 'mr-3 text-gray-400', 'ml-3 text-gray-400')} />
                            <span className="font-medium">{t('header.notificationSettings')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setFilter('All')}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${filter === 'All' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                    >
                      {t('header.all')}
                    </button>
                    <button
                      onClick={() => setFilter('Unread')}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${filter === 'Unread' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                    >
                      {t('header.unread')}
                    </button>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto px-2 pb-2 scrollbar-none">
                  {filteredNotifications.length > 0 ? (
                    <div className="space-y-0.5">
                      {filteredNotifications.map(notification => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`flex items-start p-2.5 rounded-lg cursor-pointer transition-colors ${notification.isUnread ? 'bg-blue-50/50 dark:bg-gray-800/40' : 'hover:bg-gray-50 dark:hover:bg-white/5'} ${isRTL ? 'text-right' : ''}`}
                        >
                          <div className={pickDirectionalValue(direction, 'relative flex-shrink-0 mr-3', 'relative flex-shrink-0 ml-3')}>
                            <img src={notification.avatar} alt={notification.user} className="w-12 h-12 rounded-full border border-gray-100 dark:border-gray-800" />
                            {notification.type === 'comment' && <div className={pickDirectionalValue(direction, 'absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center p-0.5', 'absolute -bottom-1 -left-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center p-0.5')}><MessageSquare size={12} className="text-white" /></div>}
                            {notification.type === 'system' && <div className={pickDirectionalValue(direction, 'absolute -bottom-1 -right-1 bg-blue-500 w-6 h-6 rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center p-0.5', 'absolute -bottom-1 -left-1 bg-blue-500 w-6 h-6 rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center p-0.5')}><Bell size={12} className="text-white" /></div>}
                            {notification.type === 'alert' && <div className={pickDirectionalValue(direction, 'absolute -bottom-1 -right-1 bg-red-500 w-6 h-6 rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center p-0.5', 'absolute -bottom-1 -left-1 bg-red-500 w-6 h-6 rounded-full border-2 border-white dark:border-[#242526] flex items-center justify-center p-0.5')}><AlertCircle size={12} className="text-white" /></div>}
                          </div>

                          <div className={pickDirectionalValue(direction, 'flex-1 min-w-0 pr-2', 'flex-1 min-w-0 pl-2')}>
                            <p className="text-[14px] leading-tight text-gray-900 dark:text-gray-100">
                              <span className={pickDirectionalValue(direction, 'font-bold text-gray-900 dark:text-white mr-1', 'font-bold text-gray-900 dark:text-white ml-1')}>{notification.user}</span>
                              <span className="text-gray-600 dark:text-gray-300">{notification.content}</span>
                            </p>
                            <p className={`text-[12px] font-semibold mt-1 ${notification.isUnread ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {notification.time}
                            </p>
                          </div>

                          {notification.isUnread && (
                            <div className="flex-shrink-0 mt-3 self-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500 shadow-sm border border-white dark:border-[#242526]"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                      <Bell size={32} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">{filter === 'Unread' ? t('header.noUnreadNotifications') : t('header.noNotifications')}</p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label={t('workspace.toggleTheme')}
            className="hidden p-2 sm:inline-flex"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </Button>

          <UserAvatarDropdown user={user} />
        </div>
      </div>
    </header>
  );
};
