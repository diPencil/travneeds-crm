import React from 'react';
import { cn } from '../../utils/cn';
import { bidiIsolateClassName } from '../../localization/direction';
import { useLocale } from '../../localization/useLocale';

export type BadgeVariant = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo' | 'gray';

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  variant = 'gray',
  className,
}) => {
  const { isRTL } = useLocale();
  const variants = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span
      className={cn(
        'ui-status-badge inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
        isRTL ? 'tracking-normal' : 'uppercase tracking-wider',
        bidiIsolateClassName,
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};
