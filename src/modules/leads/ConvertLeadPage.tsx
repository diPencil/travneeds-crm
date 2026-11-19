import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, UserCheck } from 'lucide-react';
import type { CrmRecord, CrmDirectory } from '../../../shared/crm/crm.contracts';
import { useApiResource } from '../../lib/http/useApiResource';
import { apiRequest } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataState } from '../../components/ui/DataState';

export function ConvertLeadPage() {
  const { id } = useParams();
  const { isRTL } = useLocale();
  const { csrfToken } = useAuth();
  const navigate = useNavigate();
  const record = useApiResource<CrmRecord>(`/crm/leads/${encodeURIComponent(id || '')}`);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const customers = useApiResource<CrmDirectory>(
    `/crm/customers?search=${encodeURIComponent(search)}`,
  );
  async function convert() {
    if (!record.data || !csrfToken) return;
    setSaving(true);
    setError('');
    try {
      const result = await apiRequest<{ customerId: string }>(`/crm/leads/${id}/convert`, {
        method: 'POST',
        body: { version: record.data.version, ...(customerId ? { customerId } : {}) },
        csrfToken,
      });
      navigate(`/customers/${result.customerId}`);
    } catch {
      setError(
        isRTL
          ? 'تعذر التحويل. لو البريد موجود اختر العميل الحالي، أو افتح السجل من جديد.'
          : 'Could not convert. If the email already exists, select that customer, or reopen the lead.',
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page-container">
      <PageHeader title={isRTL ? 'تحويل لعميل' : 'Convert Lead to Customer'} />
      <DataState {...record} retry={record.reload} />
      {record.data && !record.error && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-10 shadow-sm max-w-3xl mx-auto border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-center gap-8 mb-10 mt-4">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center border-2 border-blue-500">
              <span className="font-bold text-3xl text-blue-600">L</span>
            </div>
            <ArrowRight className="w-8 h-8 text-gray-400" />
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center border-2 border-emerald-500">
              <UserCheck className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center mb-6">{record.data.fullName}</h2>
          {record.data.convertedCustomerId ? (
            <Button onClick={() => navigate(`/customers/${record.data?.convertedCustomerId}`)}>
              {isRTL ? 'عرض العميل المرتبط' : 'View Linked Customer'}
            </Button>
          ) : (
            <div className="space-y-6">
              <Input
                id="convert-search"
                label={
                  isRTL ? 'بحث عن عميل موجود (اختياري)' : 'Search existing customers (optional)'
                }
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCustomerId('');
                }}
              />
              <Select
                id="convert-customer"
                label={isRTL ? 'العميل' : 'Customer'}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">
                  {isRTL
                    ? 'إنشاء عميل جديد من بيانات الـLead'
                    : 'Create a new customer from this lead'}
                </option>
                {customers.data?.records.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName} · {item.email}
                  </option>
                ))}
              </Select>
              <DataState {...customers} retry={customers.reload} />
              {error && (
                <p role="alert" className="text-red-600">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => navigate('/leads')}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button loading={saving} onClick={() => void convert()}>
                  {isRTL ? 'تأكيد التحويل' : 'Confirm Conversion'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
