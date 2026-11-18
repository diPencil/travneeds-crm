import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, Activity, LogOut, ChevronDown } from 'lucide-react';
import type { AuthUser } from '../../../shared/auth/auth.contracts';
import { useAuth } from '../../modules/auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '../../hooks/useToastContext';
import { UserAvatar } from '../ui/UserAvatar';
import { ProfileModal } from './ProfileModal';
import { ActivityLogModal } from '../../modules/audit/ActivityLogModal';
import { useLocale } from '../../localization/useLocale';
import { pickDirectionalValue } from '../../localization/direction';
import { cn } from '../../utils/cn';

interface UserAvatarDropdownProps {
  user: AuthUser | null;
}

export const UserAvatarDropdown: React.FC<UserAvatarDropdownProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const toast = useToastContext();
  const navigate = useNavigate();
  const { direction, t } = useLocale();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setIsOpen(false);

      await signOut();
      toast.info(t('auth.signedOut'));
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Logout failed', 'Please try again.', 4000);
    }
  };

  const userName = user?.fullName || '';
  const userEmail = user?.email || '';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('common.myProfile')}
        aria-expanded={isOpen}
        className={pickDirectionalValue(
          direction,
          'flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
          'flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-row-reverse',
        )}
      >
        <UserAvatar alt="Avatar" className="w-8 h-8" />
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'fixed top-20 inset-x-4 sm:absolute sm:top-auto sm:inset-x-auto sm:mt-2 z-50 py-2',
            'w-auto sm:w-64 bg-white dark:bg-gray-800 rounded-2xl sm:rounded-lg shadow-2xl sm:shadow-lg border border-gray-200 dark:border-gray-700',
            'ltr:sm:right-0 rtl:sm:left-0',
          )}
        >
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div
              className={pickDirectionalValue(
                direction,
                'flex items-center gap-3',
                'flex items-center gap-3 flex-row-reverse text-right',
              )}
            >
              <UserAvatar alt="Avatar" className="w-10 h-10" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{userName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 ltr-value">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsProfileModalOpen(true);
                setIsOpen(false);
              }}
              className={pickDirectionalValue(
                direction,
                'flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                'flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-row-reverse text-right',
              )}
            >
              <User className={pickDirectionalValue(direction, 'h-4 w-4 mr-3', 'h-4 w-4 ml-3')} />
              {t('common.myProfile')}
            </button>

            <button
              onClick={() => {
                navigate('/settings');
                setIsOpen(false);
              }}
              className={pickDirectionalValue(
                direction,
                'flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                'flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-row-reverse text-right',
              )}
            >
              <Settings
                className={pickDirectionalValue(direction, 'h-4 w-4 mr-3', 'h-4 w-4 ml-3')}
              />
              {t('common.accountSettings')}
            </button>

            <button
              onClick={() => {
                setIsActivityModalOpen(true);
                setIsOpen(false);
              }}
              className={pickDirectionalValue(
                direction,
                'flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                'flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-row-reverse text-right',
              )}
            >
              <Activity
                className={pickDirectionalValue(direction, 'h-4 w-4 mr-3', 'h-4 w-4 ml-3')}
              />
              {t('common.activityLog')}
            </button>

            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

            <button
              onClick={() => {
                handleLogout();
                setIsOpen(false);
              }}
              className={pickDirectionalValue(
                direction,
                'flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors',
                'flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-row-reverse text-right',
              )}
            >
              <LogOut className={pickDirectionalValue(direction, 'h-4 w-4 mr-3', 'h-4 w-4 ml-3')} />
              {t('app.logout')}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
      />

      <ActivityLogModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
      />
    </div>
  );
};
