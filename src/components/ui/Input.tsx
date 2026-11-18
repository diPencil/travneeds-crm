import React from 'react';
import { cn } from '../../utils/cn';
import { ltrValueClassName, ltrValueProps } from '../../localization/direction';
import { useLocale } from '../../localization/useLocale';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  const { direction, isRTL } = useLocale();
  const isLogicalLtrValue =
    props.type === 'email' ||
    props.type === 'url' ||
    props.type === 'tel' ||
    props.type === 'number' ||
    props.type === 'date' ||
    props.type === 'datetime-local' ||
    props.type === 'time';

  return (
    <div className={cn('ui-field space-y-1', isRTL && 'rtl-safe-field')}>
      {label && (
        <label
          htmlFor={props.id}
          className={cn(
            'ui-field-label block text-sm font-medium text-gray-700 dark:text-gray-300',
            isRTL && 'text-right',
          )}
        >
          {label}
        </label>
      )}
      <input
        aria-invalid={Boolean(error)}
        aria-describedby={error && props.id ? `${props.id}-error` : undefined}
        {...(isLogicalLtrValue ? ltrValueProps : { dir: direction })}
        className={cn(
          'ui-field-control block w-full rounded-2xl h-12 border-0 px-4 py-2 shadow-sm',
          'placeholder-gray-400 dark:placeholder-gray-500 bg-slate-50 dark:bg-gray-800',
          'text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500',
          'transition-all duration-200',
          isRTL && !isLogicalLtrValue && 'text-right',
          isLogicalLtrValue && ltrValueClassName,
          error && 'border-red-500 focus:ring-red-500',
          className,
        )}
        {...props}
      />
      {error && (
        <p
          id={props.id ? `${props.id}-error` : undefined}
          role="alert"
          className={cn(
            'ui-field-message text-sm text-red-600 dark:text-red-400',
            isRTL && 'text-right',
          )}
        >
          {error}
        </p>
      )}
    </div>
  );
};
