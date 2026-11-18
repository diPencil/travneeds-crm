import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard,
  LogOut, Settings, User, UserCheck, Users, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { pickDirectionalValue } from '../../localization/direction';
import { useLocale } from '../../localization/useLocale';
import type { TranslationKey } from '../../localization/messages';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}

interface NavItem {
  id: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
  href: string;
  subItems?: { id: string; labelKey: TranslationKey; href: string; icon?: LucideIcon; state?: unknown }[];
}

interface NavGroup {
  id: string;
  titleKey: TranslationKey;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    id: 'main',
    titleKey: 'nav.main',
    items: [
      { id: 'home', icon: LayoutDashboard, labelKey: 'workspace.title', href: '/' },
    ],
  },
  {
    id: 'crm',
    titleKey: 'nav.crm',
    items: [
      { id: 'leads', icon: Users, labelKey: 'nav.leads', href: '/leads' },
      { id: 'customers', icon: User, labelKey: 'nav.customers', href: '/customers' },
      { id: 'suppliers', icon: ClipboardList, labelKey: 'nav.suppliers', href: '/suppliers' },
    ],
  },
  {
    id: 'system',
    titleKey: 'nav.system',
    items: [
      { id: 'finance', icon: Wallet, labelKey: 'nav.finance', href: '/finance' },
      { id: 'users', icon: UserCheck, labelKey: 'nav.userManagement', href: '/users' },
      { id: 'settings', icon: Settings, labelKey: 'nav.settings', href: '/settings' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, isCollapsed, onCollapseToggle }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { direction, t } = useLocale();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    navigationGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (!item.subItems) {
          return;
        }

        const isActive = item.subItems.some((subItem) =>
          location.pathname === subItem.href ||
          (subItem.href !== '/' && location.pathname.startsWith(subItem.href))
        );

        if (isActive) {
          setOpenMenu(item.id);
        }
      });
    });
  }, [location.pathname]);

  const toggleMenu = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setOpenMenu((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-gray-900/50 lg:hidden transition-opacity"
          onClick={onToggle}
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 z-[120] flex flex-col bg-white dark:bg-gray-900 border-0 shadow-[8px_0_24px_rgba(15,23,42,0.04)] rtl:shadow-[-8px_0_24px_rgba(15,23,42,0.04)] ltr:left-0 rtl:right-0',
          'transition-[width,transform] duration-300',
          isCollapsed ? 'w-[72px]' : 'w-64',
          isOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full lg:!translate-x-0'
        )}
      >
        <div className="h-20 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-0">
          <div className="flex flex-col overflow-hidden">
            {!isCollapsed && (
              <>
                <img src="/logo.png" alt={t('app.name')} className="h-10 w-auto object-contain" />
              </>
            )}
          </div>
          <button
            onClick={onCollapseToggle}
            aria-label={t('workspace.toggleSidebar')}
            className="hidden lg:block p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isCollapsed
              ? pickDirectionalValue(direction, <ChevronRight size={16} />, <ChevronLeft size={16} />)
              : pickDirectionalValue(direction, <ChevronLeft size={16} />, <ChevronRight size={16} />)}
          </button>
          <button
            onClick={onToggle}
            aria-label={t('common.close')}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 scrollbar-hide">
          {navigationGroups.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              {!isCollapsed && (
                <h3 className="text-[9px] font-bold text-gray-400/70 uppercase tracking-widest mb-1.5 px-3.5">
                  {t(group.titleKey)}
                </h3>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const hasSubItems = Boolean(item.subItems?.length);
                  const isMenuOpen = openMenu === item.id;
                  const isParentActive = hasSubItems && item.subItems?.some((subItem) =>
                    location.pathname === subItem.href ||
                    (subItem.href !== '/' && location.pathname.startsWith(subItem.href))
                  );

                  const content = (
                    <>
                      <item.icon
                        className={cn(
                          'w-[18px] h-[18px] flex-shrink-0',
                          isCollapsed ? '' : pickDirectionalValue(direction, 'mr-3', 'ml-3')
                        )}
                      />
                      {!isCollapsed && (
                        <span className="font-semibold text-[13.5px] flex-1">{t(item.labelKey)}</span>
                      )}
                    </>
                  );

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <div className="flex items-center group relative">
                        {hasSubItems ? (
                          <div
                            onClick={(e) => toggleMenu(item.id, e)}
                            className={cn(
                              'flex flex-1 items-center h-11 px-4 rounded-2xl transition-all duration-300 cursor-pointer',
                              isParentActive
                                ? 'bg-[#eff6ff] text-[#3b82f6] dark:bg-blue-600/20 dark:text-blue-400'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white',
                              isCollapsed && 'justify-center px-0 w-10 mx-auto'
                            )}
                          >
                            {content}
                            {!isCollapsed && (
                              <ChevronDown
                                size={14}
                                className={cn(
                                  'text-gray-400 transition-transform duration-200',
                                  isMenuOpen ? 'rotate-180' : ''
                                )}
                              />
                            )}
                          </div>
                        ) : (
                          <NavLink
                            to={item.href}
                            end={item.href === '/'}
                            className={({ isActive }) => cn(
                              'flex flex-1 items-center h-11 px-4 rounded-2xl transition-all duration-300',
                              isActive
                                ? 'bg-[#eff6ff] text-[#3b82f6] dark:bg-blue-600/20 dark:text-blue-400'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white',
                              isCollapsed && 'justify-center px-0 w-10 mx-auto'
                            )}
                            onClick={() => {
                              if (window.innerWidth < 1024) onToggle();
                            }}
                          >
                            {content}
                          </NavLink>
                        )}

                        {isCollapsed && (
                          <div className={pickDirectionalValue(direction, 'absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl', 'absolute right-full mr-4 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl')}>
                            {t(item.labelKey)}
                          </div>
                        )}
                      </div>

                      {!isCollapsed && hasSubItems && isMenuOpen && (
                        <div className={pickDirectionalValue(direction, 'mt-1 ml-9 space-y-1 border-l border-gray-100 pl-1 dark:border-gray-800', 'mt-1 mr-9 space-y-1 border-r border-gray-100 pr-1 dark:border-gray-800')}>
                          {item.subItems?.map((subItem) => (
                            <NavLink
                              key={subItem.id}
                              to={subItem.href}
                              state={subItem.state}
                              end={true}
                              className={({ isActive }) => cn(
                                'flex items-center h-9 px-4 rounded-xl text-[12.5px] font-medium transition-all duration-300',
                                isActive && !subItem.state
                                  ? 'text-[#3b82f6] bg-blue-50/50 dark:bg-blue-600/10'
                                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/30'
                              )}
                              onClick={() => {
                                if (window.innerWidth < 1024) onToggle();
                              }}
                            >
                              {t(subItem.labelKey)}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={cn(
          "mb-4 bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] rounded-3xl shadow-lg shadow-blue-500/20 transition-all duration-300",
          isCollapsed ? "mx-3 p-2 space-y-2" : "mx-4 p-4 space-y-4"
        )}>
          <div className={cn(
            'flex items-center gap-3',
            isCollapsed && 'justify-center gap-0'
          )}>
            <UserAvatar src="/avatar-male.png" alt="SA Avatar" className={cn("transition-all duration-300", isCollapsed ? "w-7 h-7" : "w-10 h-10")} />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate leading-tight">{t('app.superAdmin')}</span>
                <span className="text-[11px] text-blue-100/80 truncate mt-0.5">{t('app.administrator')}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-all group w-full',
              isCollapsed ? 'justify-center p-2' : 'px-3 py-2'
            )}
          >
            <LogOut className={cn('transition-all duration-300', isCollapsed ? 'w-5 h-5' : cn('w-[18px] h-[18px]', pickDirectionalValue(direction, 'mr-3', 'ml-3')))} />
            {!isCollapsed && (
              <span className="font-semibold text-[13.5px]">{t('app.logout')}</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
