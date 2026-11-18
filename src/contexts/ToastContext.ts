import { createContext } from 'react';
import type { useToast } from '../hooks/useToast';
export const ToastContext = createContext<ReturnType<typeof useToast> | undefined>(undefined);
