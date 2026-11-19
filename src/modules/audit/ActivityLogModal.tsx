import { useEffect, useState } from 'react';
import { Activity, User, Settings, Edit } from 'lucide-react';
import type { AuditEvent } from '../../../shared/audit/audit.contracts';
import { AccountDialog } from '../../components/ui/AccountDialog';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { apiRequest } from '../../lib/http/api';
import { useLocale } from '../../localization/useLocale';
import { formatDateTime } from '../../utils/format';
import { auditLabel } from './audit.format';

export function ActivityLogModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useLocale();
  return isOpen ? (
    <AccountDialog
      title={t('common.activityLog')}
      icon={Activity}
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <ActivityLogPanel />
      <div className="flex justify-end mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </AccountDialog>
  ) : null;
}

export function ActivityLogPage() {
  const { t } = useLocale();
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader title={t('common.activityLog')} />
        <Card>
          <CardContent>
            <ActivityLogPanel />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivityLogPanel() {
  const { t } = useLocale();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ events: AuditEvent[] }>('/audit/mine', { signal: controller.signal })
      .then((result) => setEvents(result.events))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [loadVersion]);

  const filtered =
    events?.filter((event) => {
      const query = searchTerm.toLocaleLowerCase();
      const searchable =
        `${auditLabel(event.action, t)} ${event.entityType} ${event.entityId}`.toLocaleLowerCase();
      if (!searchable.includes(query) || (typeFilter !== 'all' && typeFilter !== event.action))
        return false;
      const date = new Date(event.createdAt.replace(' ', 'T') + 'Z');
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      if (dateFilter === 'week') start.setDate(start.getDate() - 6);
      if (dateFilter === 'month') start.setDate(1);
      return dateFilter === 'all' || date >= start;
    }) ?? [];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <Input
            id="activity-search"
            aria-label={t('audit.search')}
            placeholder={t('audit.search')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <Select
          aria-label={t('audit.types')}
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="all">{t('audit.types')}</option>
          {[...new Set(events?.map((event) => event.action) ?? [])].map((action) => (
            <option key={action} value={action}>
              {auditLabel(action, t)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('audit.date')}
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
        >
          <option value="all">{t('audit.allTime')}</option>
          <option value="today">{t('audit.today')}</option>
          <option value="week">{t('audit.week')}</option>
          <option value="month">{t('audit.month')}</option>
        </Select>
      </div>
      {failed ? (
        <div role="alert" className="py-8 text-center">
          <p>{t('settings.failed')}</p>
          <Button
            className="mt-4"
            onClick={() => {
              setFailed(false);
              setEvents(null);
              setLoadVersion((value) => value + 1);
            }}
          >
            {t('common.retry')}
          </Button>
        </div>
      ) : !events ? (
        <p role="status" className="py-12 text-center">
          {t('common.loading')}
        </p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('audit.empty')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">{t('audit.filterHint')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((event) => {
            const Icon = event.action.startsWith('auth.')
              ? User
              : event.action.startsWith('settings.')
                ? Settings
                : Edit;
            return (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                    <Icon className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {auditLabel(event.action, t)}
                    </p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      {event.entityType}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <bdi>{event.entityId}</bdi>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
