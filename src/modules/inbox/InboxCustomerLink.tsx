import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import type { CrmDirectory } from '../../../shared/crm/crm.contracts';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToastContext } from '../../hooks/useToastContext';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { useQuotationText } from '../quotations/quotation.labels';

export function InboxCustomerLink({
  threadId,
  customerId,
  onSaved,
}: {
  threadId: string;
  customerId: string | null;
  onSaved: () => void;
}) {
  const { text } = useQuotationText();
  const { csrfToken } = useAuth();
  const toast = useToastContext();
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const customers = useApiResource<CrmDirectory>(
    editing && search.trim()
      ? `/crm/customers?${new URLSearchParams({ search: search.trim() })}`
      : null,
  );

  async function save(nextId: string | null) {
    if (!csrfToken || saving) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/inbox/${threadId}/customer`, {
        method: 'PATCH',
        csrfToken,
        body: { customerId: nextId, previousCustomerId: customerId },
      });
      toast.success(
        nextId
          ? text('Customer file linked.', 'تم ربط ملف العميل.')
          : text('Customer link removed.', 'تم إزالة ربط العميل.'),
      );
      setEditing(false);
      onSaved();
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'RECORD_CHANGED') onSaved();
      setError(
        text(
          'Could not update the customer link. Check the selection and retry.',
          'تعذّر تحديث ربط العميل. راجع الاختيار وحاول مرة أخرى.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (customers.data?.records.some((record) => record.id === selection)) void save(selection);
  }

  return (
    <div className="mb-5 space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        {customerId && (
          <Link
            to={`/customers/${customerId}?section=inbox`}
            className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
          >
            {text('Customer File', 'ملف العميل')} · <bdi>CUST-{customerId}</bdi>
          </Link>
        )}
        <Button
          size="sm"
          variant="outline"
          type="button"
          aria-expanded={editing}
          disabled={saving}
          onClick={() => {
            setEditing((value) => !value);
            setError('');
          }}
        >
          <Link2 size={15} aria-hidden="true" />
          {editing
            ? text('Cancel', 'إلغاء')
            : customerId
              ? text('Change customer link', 'تغيير ربط العميل')
              : text('Link customer', 'ربط عميل')}
        </Button>
      </div>
      {editing && (
        <form onSubmit={submit} className="space-y-3">
          <Input
            id="inbox-customer-search"
            label={text('Search customers', 'بحث العملاء')}
            value={search}
            maxLength={120}
            disabled={saving}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelection('');
            }}
          />
          <DataState
            {...customers}
            empty={customers.data?.records.length === 0}
            retry={customers.reload}
          />
          {customers.data && !customers.error && customers.data.records.length > 0 && (
            <Select
              id="inbox-customer"
              label={text('Customer', 'العميل')}
              value={selection}
              disabled={saving}
              onChange={(event) => setSelection(event.target.value)}
            >
              <option value="">{text('Select a customer', 'اختار العميل')}</option>
              {customers.data.records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.fullName} · CUST-{record.id}
                </option>
              ))}
            </Select>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              type="submit"
              loading={saving}
              disabled={!selection || customers.error}
            >
              {text('Save link', 'حفظ الربط')}
            </Button>
            {customerId && (
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void save(null)}
              >
                {text('Remove link', 'إزالة الربط')}
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
