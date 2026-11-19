export const integrationProviders = [
  'smtp',
  'google',
  'translation',
  'messenger',
  'instagram',
  'whatsapp',
] as const;
export type IntegrationProvider = (typeof integrationProviders)[number];
export interface IntegrationConfiguration {
  provider: IntegrationProvider;
  enabled: boolean;
  fields: Record<string, string>;
  secrets: Record<string, boolean>;
  version: number;
  configurationStatus: 'not_configured' | 'configured';
  encryptionReady: boolean;
  webhookUrl: string | null;
}
export interface IntegrationUpdate {
  enabled: boolean;
  fields: Record<string, string>;
  secrets: Record<string, string>;
  clearSecrets: string[];
  version: number;
}
