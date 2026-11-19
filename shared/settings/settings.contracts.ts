export const localBrandAssetPath = /^\/(?!\/)[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp|svg|ico)$/;
export const localBrandAssetPathLimit = 255;

export interface BrandingSettings {
  projectName: string;
  primaryColor: string;
  logoUrl: string;
  faviconUrl: string;
}

export interface ProjectSettings extends BrandingSettings {
  baseCurrency: string;
  version: number;
}

export interface LicenseStatus {
  status: 'inactive' | 'active' | 'expired';
  plan: 'monthly' | 'annual' | null;
  expiresAt: string | null;
  activatedAt: string | null;
  serverTime: string;
  serialSuffix: string | null;
  activationAvailable: boolean;
}

export interface MonthlyLicenseActivation {
  license: LicenseStatus;
  serial: string;
}

export interface CurrencyRate {
  version: number;
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  effectiveAt: string;
  source: string;
}

export interface SettingsResponse {
  settings: ProjectSettings;
  license: LicenseStatus;
  rates: CurrencyRate[];
  currencies: string[];
  supportedCurrencies: string[];
}
