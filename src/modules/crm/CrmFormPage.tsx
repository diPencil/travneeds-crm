import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Building2, FileText } from 'lucide-react';
import type { CrmKind, CrmOptions, CrmRecord } from '../../../shared/crm/crm.contracts';
import {
  leadSources,
  leadStatuses,
  leadPriorities,
  customerStatuses,
  customerTypes,
  supplierStatuses,
} from '../../../shared/crm/crm.contracts';
import { useApiResource } from '../../lib/http/useApiResource';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';
import { useToastContext } from '../../hooks/useToastContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';
import { crmLabel } from './crm.labels';
import { useNotifications } from '../notifications/useNotifications';

const names = {
  leads: ['Lead', 'العميل المحتمل'],
  customers: ['Customer', 'العميل'],
  suppliers: ['Supplier', 'المورد'],
};
export function CrmFormPage({ kind, readOnly = false }: { kind: CrmKind; readOnly?: boolean }) {
  const { id } = useParams();
  const record = useApiResource<CrmRecord>(id ? `/crm/${kind}/${encodeURIComponent(id)}` : null);
  const options = useApiResource<CrmOptions>('/crm/options');
  if (id && (!record.data || record.error)) return <DataState {...record} retry={record.reload} />;
  if (!options.data || options.error) return <DataState {...options} retry={options.reload} />;
  return (
    <CrmForm
      key={`${kind}-${id || 'new'}`}
      kind={kind}
      record={record.data || undefined}
      options={options.data}
      readOnly={readOnly || Boolean(record.data?.archivedAt)}
    />
  );
}
function defaults(kind: CrmKind, record?: CrmRecord): Record<string, string> {
  const common = {
    fullName: record?.fullName || '',
    email: record?.email || '',
    phone: record?.phone || '',
    company: record?.company || '',
    notes: record?.notes || '',
  };
  if (kind === 'leads')
    return {
      ...common,
      type: record?.type || 'B2C',
      status: record?.status || 'New',
      source: record?.source || 'Website',
      priority: record?.priority || 'Medium',
      assignedUserId: record?.assignedUserId || '',
      valueAmount: record?.valueAmount || '',
      currency: record?.currency || '',
      nextFollowUpAt: record?.nextFollowUpAt ? localDateTime(record.nextFollowUpAt) : '',
    };
  if (kind === 'customers')
    return {
      ...common,
      type: record?.type || 'Individual',
      status: record?.status || 'Active',
      nationality: record?.nationality || '',
      assignedUserId: record?.assignedUserId || '',
    };
  return {
    ...common,
    category: record?.category || '',
    contactName: record?.contactName || '',
    country: record?.country || '',
    city: record?.city || '',
    status: record?.status || 'Active',
  };
}
function localDateTime(value: string) {
  const date = new Date(/[Z+]\d*|Z$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function CrmForm({
  kind,
  record,
  options,
  readOnly,
}: {
  kind: CrmKind;
  record?: CrmRecord;
  options: CrmOptions;
  readOnly: boolean;
}) {
  const { isRTL } = useLocale();
  const { csrfToken } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const toast = useToastContext();
  const navigate = useNavigate();
  const [details, setDetails] = useState(() => defaults(kind, record));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const name = names[kind][isRTL ? 1 : 0];
  const set = (key: string, value: string) =>
    setDetails((previous) => ({ ...previous, [key]: value }));
  const input = (
    key: string,
    en: string,
    ar: string,
    type = 'text',
    required = false,
    maxLength = 160,
  ) => (
    <Input
      key={key}
      id={`crm-${key}`}
      label={isRTL ? ar : en}
      type={type}
      value={details[key]}
      onChange={(event) => set(key, event.target.value)}
      required={required}
      maxLength={maxLength}
      disabled={readOnly || saving}
    />
  );
  const select = (key: string, en: string, ar: string, values: readonly string[]) => (
    <Select
      key={key}
      id={`crm-${key}`}
      label={isRTL ? ar : en}
      value={details[key]}
      onChange={(event) => set(key, event.target.value)}
      disabled={readOnly || saving}
    >
      {values.map((value) => (
        <option key={value} value={value}>
          {crmLabel(value, isRTL)}
        </option>
      ))}
    </Select>
  );
  const assignment = (
    <Select
      id="crm-assignedUserId"
      label={isRTL ? 'الموظف المسؤول' : 'Assigned To'}
      value={details.assignedUserId || ''}
      onChange={(event) => set('assignedUserId', event.target.value)}
      disabled={readOnly || saving}
    >
      <option value="">{isRTL ? 'بدون تعيين' : 'Unassigned'}</option>
      {record?.assignedUserId &&
        !options.agents.some((agent) => agent.id === record.assignedUserId) && (
          <option value={record.assignedUserId}>
            {record.assignedName} ({isRTL ? 'غير نشط' : 'inactive'})
          </option>
        )}
      {options.agents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.fullName}
        </option>
      ))}
    </Select>
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setSaving(true);
    setError('');
    const body = { ...details };
    if (body.nextFollowUpAt) body.nextFollowUpAt = new Date(body.nextFollowUpAt).toISOString();
    try {
      await apiRequest(record ? `/crm/${kind}/${record.id}` : `/crm/${kind}`, {
        method: record ? 'PATCH' : 'POST',
        body: record ? { ...body, version: record.version } : body,
        csrfToken,
      });
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      void refreshNotifications();
      navigate(`/${kind}`);
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.code === 'EMAIL_IN_USE'
          ? isRTL
            ? 'البريد مسجل لعميل آخر. استخدم العميل الموجود عند التحويل.'
            : 'Email belongs to an existing customer. Select that customer when converting.'
          : failure instanceof ApiError && failure.code === 'VERSION_CONFLICT'
            ? isRTL
              ? 'السجل اتغير. افتحه من جديد قبل الحفظ.'
              : 'Record changed. Reopen it before saving.'
            : isRTL
              ? 'تعذر الحفظ. راجع البيانات وحاول مجدداً.'
              : 'Could not save. Check the details and try again.',
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader
          title={`${isRTL ? (readOnly ? 'تفاصيل ' : record ? 'تعديل ' : 'إضافة ') : readOnly ? 'View ' : record ? 'Edit ' : 'New '}${name}`}
          actions={
            <Button className="bg-white/10 text-white" onClick={() => navigate(`/${kind}`)}>
              <ArrowLeft className="w-5 h-5" />
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
          }
        />
        <form onSubmit={(event) => void save(event)} className="space-y-6">
          <Card className="rounded-3xl">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-lg font-bold flex gap-3 items-center mb-6">
                <User className="w-5 h-5 text-blue-600" />
                {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {input(
                  'fullName',
                  kind === 'suppliers' ? 'Supplier Name' : 'Full Name',
                  kind === 'suppliers' ? 'اسم المورد' : 'الاسم الكامل',
                  'text',
                  true,
                )}
                {input('email', 'Email', 'البريد الإلكتروني', 'email', false, 254)}
                {input('phone', 'Phone', 'الهاتف', 'tel', false, 30)}
                {input('company', 'Company', 'الشركة')}
                {kind === 'customers' && (
                  <>
                    {input('nationality', 'Nationality', 'الجنسية', 'text', false, 100)}
                    {select('type', 'Customer Type', 'نوع العميل', customerTypes)}
                    {select('status', 'Status', 'الحالة', customerStatuses)}
                    {assignment}
                  </>
                )}
                {kind === 'suppliers' && (
                  <>
                    {input('category', 'Category', 'التصنيف', 'text', true, 100)}
                    {input('contactName', 'Contact Person', 'جهة التواصل')}
                    {input('country', 'Country', 'الدولة', 'text', false, 100)}
                    {input('city', 'City', 'المدينة', 'text', false, 100)}
                    {select('status', 'Status', 'الحالة', supplierStatuses)}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          {kind === 'leads' && (
            <Card className="rounded-3xl">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-lg font-bold flex gap-3 items-center mb-6">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  {isRTL ? 'بيانات العميل المحتمل' : 'Lead Details'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {select('source', 'Source', 'المصدر', leadSources)}
                  {select('type', 'Type', 'النوع', ['B2B', 'B2C'])}
                  {select('status', 'Status', 'الحالة', leadStatuses)}
                  {select('priority', 'Priority', 'الأولوية', leadPriorities)}
                  {assignment}
                  <Input
                    id="crm-nextFollowUpAt"
                    label={
                      isRTL ? 'المتابعة القادمة (توقيت جهازك)' : 'Next Follow-up (your local time)'
                    }
                    type="datetime-local"
                    value={details.nextFollowUpAt}
                    disabled={readOnly || saving}
                    onChange={(event) => set('nextFollowUpAt', event.target.value)}
                  />
                  <Input
                    id="crm-valueAmount"
                    label={isRTL ? 'القيمة المتوقعة (اختياري)' : 'Expected Value (optional)'}
                    inputMode="decimal"
                    pattern="(0|[1-9][0-9]{0,12})(\.[0-9]{1,2})?"
                    value={details.valueAmount}
                    disabled={readOnly || saving}
                    onChange={(event) => {
                      const amount = event.target.value;
                      setDetails((previous) => ({
                        ...previous,
                        valueAmount: amount,
                        currency: amount ? previous.currency || options.baseCurrency : '',
                      }));
                    }}
                  />
                  <Input
                    id="crm-currency"
                    label={isRTL ? 'رمز العملة' : 'Currency Code'}
                    maxLength={3}
                    pattern="[A-Z]{3}"
                    required={Boolean(details.valueAmount)}
                    value={details.currency}
                    disabled={readOnly || saving || !details.valueAmount}
                    onChange={(event) => set('currency', event.target.value.toUpperCase())}
                  />
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="rounded-3xl">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-lg font-bold flex gap-3 items-center mb-6">
                <FileText className="w-5 h-5 text-blue-600" />
                {isRTL ? 'ملاحظات' : 'Notes'}
              </h2>
              <label htmlFor="crm-notes" className="sr-only">
                {isRTL ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                id="crm-notes"
                maxLength={5000}
                rows={4}
                className="w-full p-4 bg-slate-50 dark:bg-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={details.notes}
                disabled={readOnly || saving}
                onChange={(event) => set('notes', event.target.value)}
              />
            </CardContent>
          </Card>
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(`/${kind}`)}>
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
            {!readOnly && (
              <Button type="submit" loading={saving}>
                <Save className="w-4 h-4" />
                {isRTL ? 'حفظ' : 'Save'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
