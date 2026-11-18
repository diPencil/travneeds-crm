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
  activationAvailable: false;
}

export interface CurrencyRate {
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
}
