import type {
  ProjectSettings,
  SettingsResponse,
} from '../../../shared/settings/settings.contracts';
import { apiRequest } from '../../lib/http/api';

export const readSettings = (signal: AbortSignal) =>
  apiRequest<SettingsResponse>('/settings', { signal });
export const saveSettings = (settings: ProjectSettings, csrfToken: string) =>
  apiRequest<ProjectSettings>('/settings', {
    method: 'PATCH',
    body: settings,
    csrfToken,
  });
