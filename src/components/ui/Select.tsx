import React from 'react';
import { cn } from '../../utils/cn';
import { useLocale } from '../../localization/useLocale';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  className,
  children,
  ...props
}) => {
  const { direction, isRTL } = useLocale();

  return (
    <div className={cn('ui-field space-y-1', isRTL && 'rtl-safe-field')}>
      {label && (
        <label className={cn('ui-field-label block text-sm font-medium text-gray-700 dark:text-gray-300', isRTL && 'text-right')}>
          {label}
        </label>
      )}
      <select
        dir={direction}
        className={cn(
          'ui-field-control block w-full rounded-2xl h-12 border-0 px-4 py-2 shadow-sm',
          'bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-white font-medium',
          isRTL && 'text-right',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className={cn('ui-field-message text-sm text-red-600 dark:text-red-400', isRTL && 'text-right')}>{error}</p>
      )}
    </div>
  );
};
