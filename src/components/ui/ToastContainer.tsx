import React from 'react';
import { Toast } from './Toast';
import { useToastContext } from '../../hooks/useToastContext';
import { useLocale } from '../../localization/useLocale';
import { pickDirectionalValue } from '../../localization/direction';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastContext();
  const { direction } = useLocale();

  return (
    <>
      <div
        className={pickDirectionalValue(
          direction,
          'fixed top-4 right-4 z-[210] space-y-2',
          'fixed top-4 left-4 z-[210] space-y-2',
        )}
      >
        {toasts
          .filter((toast) => !toast.placement)
          .map((toast) => (
            <Toast key={toast.id} {...toast} onClose={removeToast} />
          ))}
      </div>
      <div className="pointer-events-none fixed inset-x-3 z-[210] bottom-[max(1rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-2">
        {toasts
          .filter((toast) => toast.placement === 'bottom-center')
          .map((toast) => (
            <Toast key={toast.id} {...toast} onClose={removeToast} />
          ))}
      </div>
    </>
  );
};
