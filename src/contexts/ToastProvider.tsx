import type { ReactNode } from 'react';
import { useToast } from '../hooks/useToast';
import { ToastContext } from './ToastContext';

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  return <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>;
}
