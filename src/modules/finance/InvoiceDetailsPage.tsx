import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Pencil, Check } from 'lucide-react';
import type { InvoiceDocument as Document } from '../../../shared/finance/invoice.contracts';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';
import { FinanceHeading } from './FinanceComponents';
import { InvoiceDocument } from './InvoiceDocument';
import { useInvoiceCopy } from './invoice.copy';
export function InvoiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, csrfToken } = useAuth();
  const { copy, isRTL } = useInvoiceCopy();
  const resource = useApiResource<{ invoice: Document }>(
    id ? `/finance/invoices/${encodeURIComponent(id)}` : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const invoice = resource.error ? undefined : resource.data?.invoice;
  if (!user?.roles.includes('admin'))
    return <p role="alert">{isRTL ? 'غير مصرح' : 'Access denied'}</p>;
  const editable = invoice?.status === 'draft' && invoice.items.length > 0;
  async function issue() {
    if (!invoice || !csrfToken || busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/finance/invoices/${invoice.id}/issue`, {
        method: 'POST',
        csrfToken,
        body: { version: invoice.version },
      });
      resource.reload();
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.code === 'RECORD_CHANGED'
          ? copy.changed
          : copy.issueFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="w-full pb-8 space-y-6">
      <FinanceHeading
        title={copy.details}
        description={invoice?.number || copy.draft}
        back
        actions={
          <>
            <Button
              className="bg-white text-blue-600 hover:bg-gray-50"
              disabled={!invoice}
              onClick={() => window.print()}
            >
              <Printer size={16} />
              {copy.print}
            </Button>
            {editable && (
              <Button
                className="bg-white/10 text-white hover:bg-white/20"
                onClick={() => navigate(`/finance/issue-invoice?invoiceId=${invoice.id}`)}
              >
                <Pencil size={16} />
                {copy.edit}
              </Button>
            )}
          </>
        }
      />
      <DataState {...resource} retry={resource.reload} />
      {error && (
        <p role="alert" className="p-4 rounded-xl bg-red-50 text-red-700">
          {error}
        </p>
      )}
      {invoice && (
        <>
          {editable && (
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl">
              <p className="text-sm text-gray-500">{copy.issueHelp}</p>
              <Button
                onClick={() => void issue()}
                loading={busy}
                disabled={busy || resource.loading}
              >
                <Check size={16} />
                {copy.issue}
              </Button>
            </div>
          )}
          {invoice.status === 'issued' && (
            <p className="text-sm text-emerald-600">{copy.immutable}</p>
          )}
          <InvoiceDocument invoice={invoice} />
        </>
      )}
    </div>
  );
}
