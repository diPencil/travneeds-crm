import { createContext } from 'react';
import type { BrandingSettings } from '../../../shared/settings/settings.contracts';

export interface BrandingContextValue {
  branding: BrandingSettings | null;
  updateBranding: (settings: BrandingSettings) => void;
}

export const BrandingContext = createContext<BrandingContextValue | null>(null);
