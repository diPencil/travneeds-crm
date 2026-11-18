import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { BrandingSettings } from '../../../shared/settings/settings.contracts';
import { apiRequest } from '../../lib/http/api';
import { BrandingContext } from './BrandingContext';

const originalBlue: Record<number, string> = {
  50: '239 246 255',
  100: '219 234 254',
  200: '191 219 254',
  300: '147 197 253',
  400: '96 165 250',
  500: '59 130 246',
  600: '37 99 235',
  700: '29 78 216',
  800: '30 64 175',
  900: '30 58 138',
  950: '23 37 84',
};

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const updateBranding = useCallback((settings: BrandingSettings) => {
    setBranding(settings);
    document.title = settings.projectName;
    document
      .querySelector<HTMLLinkElement>('link[rel="icon"]')
      ?.setAttribute('href', settings.faviconUrl);
    const channels = settings.primaryColor
      .slice(1)
      .match(/.{2}/g)!
      .map((value) => parseInt(value, 16));
    for (const [shade, original] of Object.entries(originalBlue)) {
      const weight = Number(shade);
      const ratio = weight < 600 ? (600 - weight) / 600 : (weight - 600) / 700;
      const target = weight < 600 ? 255 : 0;
      const color =
        settings.primaryColor.toLowerCase() === '#2563eb'
          ? original
          : channels.map((channel) => Math.round(channel + (target - channel) * ratio)).join(' ');
      document.documentElement.style.setProperty(`--brand-${shade}`, color);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<BrandingSettings>('/settings/branding', { signal: controller.signal })
      .then(updateBranding)
      .catch(() => {
        /* The document retains its packaged identity while the API is unavailable. */
      });
    return () => controller.abort();
  }, [updateBranding]);

  return (
    <BrandingContext.Provider value={{ branding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}
