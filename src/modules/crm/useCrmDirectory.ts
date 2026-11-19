import { useState } from 'react';
import type { CrmKind, CrmDirectory, CrmOptions } from '../../../shared/crm/crm.contracts';
import { useApiResource } from '../../lib/http/useApiResource';

export function useCrmDirectory(kind: CrmKind, overdue = false, type = '') {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type,
    source: '',
    agent: '',
    archived: 'false',
    page: '1',
  });
  const query = new URLSearchParams({ ...filters, overdue: String(overdue) }).toString();
  const resource = useApiResource<CrmDirectory>(`/crm/${kind}?${query}`);
  const options = useApiResource<CrmOptions>('/crm/options');
  const filter = (key: keyof typeof filters, value: string) =>
    setFilters((previous) => ({ ...previous, page: '1', [key]: value }));
  return {
    ...resource,
    options,
    filters,
    filter,
    records: resource.data?.records ?? [],
    metrics: resource.data?.metrics,
  };
}
