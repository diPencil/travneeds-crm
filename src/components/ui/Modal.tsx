import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLocale } from '../../localization/useLocale';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const { direction, isRTL, t } = useLocale();

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className={cn(
          'relative w-full rounded-3xl bg-white shadow-2xl dark:bg-gray-900 flex flex-col max-h-[90vh]',
          isRTL && 'text-right',
          sizes[size]
        )}>
          <div className={cn('ui-modal-header flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800 shrink-0', isRTL && 'flex-row-reverse')}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={t('common.close')}
            >
              <X size={24} />
            </button>
          </div>
          <div className={cn('ui-modal-content p-6 overflow-y-auto', isRTL && 'text-right')} dir={direction}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
