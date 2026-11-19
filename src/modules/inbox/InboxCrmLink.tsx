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

export function InboxCrmLink({
  threadId,
  kind,
  recordId,
  previousId,
  allowEdit = true,
  onSaved,
}: {
  threadId: string;
  kind: 'lead' | 'customer';
  recordId: string | null;
  previousId: string | null;
  allowEdit?: boolean;
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
  const isLead = kind === 'lead';
  const directory = isLead ? 'leads' : 'customers';
  const recordLabel = isLead ? text('Lead', 'ليد') : text('Customer', 'العميل');
  const prefix = isLead ? 'LD' : 'CUST';
  const records = useApiResource<CrmDirectory>(
    editing && search.trim()
      ? `/crm/${directory}?${new URLSearchParams({ search: search.trim() })}`
      : null,
  );

  async function save(nextId: string | null) {
    if (!csrfToken || saving) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/inbox/${threadId}/${kind}`, {
        method: 'PATCH',
        csrfToken,
        body: isLead
          ? { leadId: nextId, previousLeadId: previousId }
          : { customerId: nextId, previousCustomerId: previousId },
      });
      toast.success(
        isLead
          ? text('Conversation linked to lead.', 'تم ربط المحادثة بالليد.')
          : nextId
            ? text('Customer file linked.', 'تم ربط ملف العميل.')
            : text('Customer link removed.', 'تم إزالة ربط العميل.'),
      );
      setEditing(false);
      onSaved();
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        ['RECORD_CHANGED', 'CONVERSATION_HAS_CUSTOMER'].includes(failure.code ?? '')
      )
        onSaved();
      setError(
        text(
          'Could not update the link. Check the selection and retry.',
          'تعذّر تحديث الربط. راجع الاختيار وحاول مرة أخرى.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (records.data?.records.some((record) => record.id === selection)) void save(selection);
  }

  if (!recordId && !allowEdit) return null;
  return (
    <div className="mb-5 space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        {recordId && (
          <Link
            to={isLead ? `/leads/${recordId}` : `/customers/${recordId}?section=inbox`}
            className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
          >
            {isLead ? recordLabel : text('Customer File', 'ملف العميل')} ·{' '}
            <bdi>
              {prefix}-{recordId}
            </bdi>
          </Link>
        )}
        {allowEdit && (
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
              : isLead
                ? recordId
                  ? text('Change lead link', 'تغيير ربط الليد')
                  : text('Link existing lead', 'ربط ليد موجود')
                : recordId
                  ? text('Change customer link', 'تغيير ربط العميل')
                  : text('Link customer', 'ربط عميل')}
          </Button>
        )}
        {allowEdit && isLead && !recordId && !editing && (
          <Button size="sm" loading={saving} type="button" onClick={() => void save(null)}>
            {text('Create lead', 'إنشاء ليد')}
          </Button>
        )}
      </div>
      {editing && allowEdit && (
        <form onSubmit={submit} className="space-y-3">
          <Input
            id={`inbox-${kind}-search`}
            label={
              isLead ? text('Search leads', 'بحث الليدز') : text('Search customers', 'بحث العملاء')
            }
            value={search}
            maxLength={120}
            disabled={saving}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelection('');
            }}
          />
          <DataState
            {...records}
            empty={records.data?.records.length === 0}
            retry={records.reload}
          />
          {records.data && !records.error && records.data.records.length > 0 && (
            <Select
              id={`inbox-${kind}`}
              label={recordLabel}
              value={selection}
              disabled={saving}
              onChange={(event) => setSelection(event.target.value)}
            >
              <option value="">
                {isLead
                  ? text('Select a lead', 'اختار الليد')
                  : text('Select a customer', 'اختار العميل')}
              </option>
              {records.data.records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.fullName} · {prefix}-{record.id}
                </option>
              ))}
            </Select>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="submit" loading={saving} disabled={!selection || records.error}>
              {text('Save link', 'حفظ الربط')}
            </Button>
            {!isLead && previousId && (
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
      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
