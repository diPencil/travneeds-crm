import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';
import { useLocale } from '../../localization/useLocale';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'success' | 'info';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isLoading = false,
}) => {
  const { isRTL, t } = useLocale();
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle className="h-6 w-6 text-red-600" />,
          bg: 'bg-red-100',
          button: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
          bg: 'bg-orange-100',
          button: 'bg-orange-600 hover:bg-orange-700',
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          bg: 'bg-green-100',
          button: 'bg-green-600 hover:bg-green-700',
        };
      default:
        return {
          icon: <HelpCircle className="h-6 w-6 text-blue-600" />,
          bg: 'bg-blue-100',
          button: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const styles = getVariantStyles();

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal Content */}
        <div
          className={cn(
            'relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-2xl transition-all border border-gray-100 dark:border-gray-700',
            isRTL && 'text-right',
          )}
        >
          <div
            className={cn(
              'flex items-start space-x-4',
              isRTL && 'flex-row-reverse space-x-reverse',
            )}
          >
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${styles.bg} dark:bg-opacity-20`}
            >
              {styles.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label={t('common.close')}
            >
              <X size={20} />
            </button>
          </div>

          <div
            className={cn(
              'ui-modal-actions mt-8 flex justify-end gap-3',
              isRTL && 'flex-row-reverse justify-start',
            )}
          >
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 py-2.5 font-bold"
              disabled={isLoading}
            >
              {cancelText === 'Cancel' ? t('common.cancel') : cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              className={`px-8 py-2.5 font-bold text-white shadow-lg transition-all active:scale-95 ${styles.button}`}
              loading={isLoading}
              disabled={isLoading}
            >
              {confirmText === 'Confirm' ? t('common.confirm') : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
