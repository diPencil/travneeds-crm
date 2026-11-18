import React from 'react';
import { cn } from '../../utils/cn';
import { useLocale } from '../../localization/useLocale';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  const { isRTL } = useLocale();

  return (
    <div
      className={cn(
        'ui-card rounded-3xl border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-gray-900',
        isRTL && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className, ...props }) => {
  const { isRTL } = useLocale();

  return (
    <div className={cn('ui-card-header border-b border-gray-100 px-6 py-5 dark:border-gray-800', isRTL && 'text-right', className)} {...props}>
      {children}
    </div>
  );
};

export const CardContent: React.FC<CardProps> = ({ children, className, ...props }) => {
  const { isRTL } = useLocale();

  return (
    <div className={cn('ui-card-content p-6', isRTL && 'text-right', className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900 dark:text-white', className)} {...props}>
      {children}
    </h3>
  );
};
