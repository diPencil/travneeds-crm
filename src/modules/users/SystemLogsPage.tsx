import { useEffect, useState } from 'react';
import { Search, AlertCircle, CheckCircle, Shield, Terminal, Download } from 'lucide-react';
import {
  auditModules,
  auditSeverities,
  type SystemAuditList,
} from '../../../shared/audit/audit.contracts';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { DataState } from '../../components/ui/DataState';
import { formatDate } from '../../utils/format';
import { useCsvExport } from '../../hooks/useCsvExport';
import { auditLabel } from '../audit/audit.format';
import { userLabel } from './user.labels';

export function SystemLogsPage() {
  const exportCsv = useCsvExport();
  const { isRTL, t, locale } = useLocale();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ search: '', module: '', severity: '', page: '1' });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const query = new URLSearchParams(filters).toString();
  const resource = useApiResource<SystemAuditList>(`/users/logs?${query}`);
  const filter = (key: keyof typeof filters, value: string) =>
    setFilters((previous) => ({ ...previous, page: '1', [key]: value }));
  const { reload } = resource;
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) reload();
    }, 30000);
    const focus = () => reload();
    window.addEventListener('focus', focus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [reload]);
  if (!user?.roles.includes('admin'))
    return <p role="alert">{isRTL ? 'غير مصرح' : 'Access denied'}</p>;
  const events = resource.data?.events ?? [];
  const total = resource.data?.total ?? 0;
  const page = Number(filters.page);
  const pages = Math.max(1, Math.ceil(total / 50));
  async function exportLogs() {
    setExporting(true);
    setExportError('');
    try {
      const result = await apiRequest<SystemAuditList>(`/users/logs/export?${query}`);
      exportCsv('system-audit.csv', [
        [
          isRTL ? 'التوقيت' : 'Timestamp',
          isRTL ? 'المستخدم' : 'Operator',
          isRTL ? 'الإجراء' : 'Action',
          isRTL ? 'الموديول' : 'Module',
          isRTL ? 'التفاصيل' : 'Details',
          isRTL ? 'الخطورة' : 'Severity',
          isRTL ? 'الحالة' : 'Status',
        ],
        ...result.events.map((event) => [
          event.createdAt,
          event.actorName || (isRTL ? 'النظام' : 'System'),
          auditLabel(event.action, t),
          userLabel(event.module, isRTL),
          [event.details, event.requestIp, event.entityId].filter(Boolean).join(' · '),
          userLabel(event.severity, isRTL),
          userLabel(event.outcome, isRTL),
        ]),
      ]);
    } catch (error) {
      setExportError(
        error instanceof ApiError && error.code === 'EXPORT_TOO_LARGE'
          ? isRTL
            ? 'التصدير بحد أقصى 10 آلاف سجل. استخدم الفلاتر لتقليل النتائج.'
            : 'Export supports up to 10,000 entries. Narrow the filters first.'
          : isRTL
            ? 'تعذر تصدير السجل'
            : 'Could not export logs',
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2563EB] text-white p-6 sm:p-8 rounded-3xl shadow-lg shadow-blue-500/20 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <span className="p-2 bg-white/20 rounded-xl me-3">
                <Terminal className="h-6 w-6 text-white" />
              </span>
              {isRTL ? 'سجل تدقيق النظام' : 'System Audit Trail'}
            </h1>
            <p className="text-blue-100 font-medium mt-1">
              {isRTL
                ? 'متابعة العمليات الفعلية وأحداث الأمان في كل الموديولز'
                : 'Real-time surveillance of all system modules and security events'}
            </p>
          </div>
          <Button
            variant="outline"
            className="shadow-sm bg-white text-blue-600 hover:bg-blue-50 border-none"
            loading={exporting}
            disabled={!resource.data || resource.error}
            onClick={() => void exportLogs()}
          >
            <Download className="h-4 w-4" />
            <span>{isRTL ? 'تصدير السجل' : 'Export Logs'}</span>
          </Button>
        </div>
        <Card className="shadow-sm bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              <div className="relative flex-1">
                <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  aria-label={isRTL ? 'البحث في السجل' : 'Search logs'}
                  placeholder={isRTL ? 'ابحث في السجل…' : 'Search logs...'}
                  className="ps-12 h-10"
                  value={filters.search}
                  onChange={(event) => filter('search', event.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  aria-label={isRTL ? 'فلتر الموديول' : 'Filter module'}
                  className="w-full sm:w-48 h-10"
                  value={filters.module}
                  onChange={(event) => filter('module', event.target.value)}
                >
                  <option value="">{isRTL ? 'كل الموديولز' : 'All Modules'}</option>
                  {auditModules.map((module) => (
                    <option key={module} value={module}>
                      {userLabel(module, isRTL)}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label={isRTL ? 'فلتر درجة الخطورة' : 'Filter severity'}
                  className="w-full sm:w-48 h-10"
                  value={filters.severity}
                  onChange={(event) => filter('severity', event.target.value)}
                >
                  <option value="">{isRTL ? 'كل درجات الخطورة' : 'All Severities'}</option>
                  {auditSeverities.map((severity) => (
                    <option key={severity} value={severity}>
                      {userLabel(severity, isRTL)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        {exportError && (
          <p role="alert" className="text-red-600">
            {exportError}
          </p>
        )}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    {(isRTL
                      ? [
                          'التوقيت',
                          'المستخدم',
                          'الإجراء',
                          'الموديول',
                          'التفاصيل',
                          'الخطورة',
                          'الحالة',
                        ]
                      : [
                          'Timestamp',
                          'Operator',
                          'Action',
                          'Module',
                          'Details',
                          'Severity',
                          'Status',
                        ]
                    ).map((label) => (
                      <th
                        key={label}
                        className="px-6 py-4 text-start text-[10px] font-bold text-gray-500 uppercase tracking-widest"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {!resource.error &&
                    events.map((event) => (
                      <tr
                        key={event.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatDate(event.createdAt, { locale })}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            {new Date(
                              /^\d{4}-\d{2}-\d{2} /.test(event.createdAt)
                                ? event.createdAt.replace(' ', 'T') + 'Z'
                                : event.createdAt,
                            ).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${event.actorId ? 'overflow-hidden border border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                            >
                              {event.actorId ? (
                                <img
                                  src={`/avatar-${event.actorAvatarGender}.png`}
                                  alt={event.actorName || ''}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Shield className="h-4 w-4" />
                              )}
                            </div>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                              {event.actorName || (isRTL ? 'النظام' : 'System')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {auditLabel(event.action, t)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded uppercase tracking-widest">
                            {userLabel(event.module, isRTL)}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p
                            className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1"
                            title={[event.details, event.requestIp, event.entityId]
                              .filter(Boolean)
                              .join(' · ')}
                          >
                            {event.details ||
                              (event.entityId
                                ? `${userLabel(event.module, isRTL)}: ${event.entityId}`
                                : '—')}
                            {event.requestIp && (
                              <>
                                {' '}
                                · IP <bdi>{event.requestIp}</bdi>
                              </>
                            )}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${event.severity === 'critical' ? 'text-red-600 bg-red-100 dark:bg-red-900/40' : event.severity === 'warning' ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' : 'text-blue-600 bg-blue-100 dark:bg-blue-900/40'}`}
                          >
                            {userLabel(event.severity, isRTL)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center">
                            {event.outcome === 'success' ? (
                              <CheckCircle
                                aria-label={userLabel(event.outcome, isRTL)}
                                className="h-4 w-4 text-emerald-500"
                              />
                            ) : (
                              <AlertCircle
                                aria-label={userLabel(event.outcome, isRTL)}
                                className="h-4 w-4 text-rose-500"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <DataState {...resource} empty={!events.length} retry={resource.reload} />
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-black uppercase tracking-widest text-gray-400 px-2">
          <p>
            {isRTL
              ? `عرض ${events.length} من ${total} سجل`
              : `Showing ${events.length} of ${total} high-integrity entries`}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-6 border-none bg-white dark:bg-gray-800 shadow-sm"
              disabled={page <= 1 || resource.loading}
              onClick={() => filter('page', String(page - 1))}
            >
              {isRTL ? 'السابق' : 'Previous'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-6 border-none bg-white dark:bg-gray-800 shadow-sm"
              disabled={page >= pages || resource.loading}
              onClick={() => filter('page', String(page + 1))}
            >
              {isRTL ? 'الصفحة التالية' : 'Next Page'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
