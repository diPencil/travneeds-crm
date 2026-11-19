import type { ReactNode } from 'react';
import { Search, Eye, Edit, Archive, RotateCcw, ArrowRight, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CrmKind, CrmRecord } from '../../../shared/crm/crm.contracts';
import { useLocale } from '../../localization/useLocale';
import { useAuth } from '../auth/useAuth';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useToastContext } from '../../hooks/useToastContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { TableActionsDropdown } from '../../components/ui/TableActionsDropdown';

export function CrmFilters({
  search,
  onSearch,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  children: ReactNode;
}) {
  const { isRTL } = useLocale();
  return (
    <Card className="rounded-3xl border-0 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] bg-white dark:bg-gray-900 mb-8">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 start-4" />
            <Input
              aria-label={isRTL ? 'بحث السجلات' : 'Search records'}
              placeholder={isRTL ? 'ابحث بالاسم أو البريد…' : 'Search by name, email...'}
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              className="h-12 bg-slate-50 border-0 rounded-2xl font-medium ps-12"
            />
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
export function CrmActions({
  kind,
  record,
  reload,
}: {
  kind: CrmKind;
  record: CrmRecord;
  reload: () => void;
}) {
  const { user, csrfToken } = useAuth();
  const { isRTL } = useLocale();
  const navigate = useNavigate();
  const toast = useToastContext();
  async function archive() {
    if (!csrfToken) return;
    try {
      await apiRequest(`/crm/${kind}/${record.id}/archive`, {
        method: 'PATCH',
        body: { version: record.version, archived: !record.archivedAt },
        csrfToken,
      });
      reload();
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.code === 'VERSION_CONFLICT'
          ? isRTL
            ? 'السجل اتغير. أعد تحميل القائمة.'
            : 'Record changed. Reload the list.'
          : isRTL
            ? 'تعذر تنفيذ العملية'
            : 'Could not complete operation',
      );
    }
  }
  return (
    <TableActionsDropdown
      actions={[
        {
          label:
            kind === 'customers'
              ? isRTL
                ? 'ملف العميل'
                : 'Customer File'
              : isRTL
                ? 'عرض التفاصيل'
                : 'View Details',
          icon: Eye,
          onClick: () => navigate(`/${kind}/${record.id}`),
        },
        {
          label: isRTL ? 'تعديل' : 'Edit',
          icon: Edit,
          hidden: Boolean(record.archivedAt),
          onClick: () => navigate(`/${kind}/${record.id}/edit`),
        },
        {
          label: isRTL ? 'فتح البريد' : 'Open Email',
          icon: Mail,
          hidden: !record.email,
          onClick: () => {
            window.location.href = `mailto:${encodeURIComponent(record.email || '')}`;
          },
        },
        {
          label: isRTL ? 'تحويل لعميل' : 'Convert to Customer',
          icon: ArrowRight,
          hidden:
            kind !== 'leads' || Boolean(record.convertedCustomerId) || Boolean(record.archivedAt),
          onClick: () => navigate(`/leads/${record.id}/convert`),
        },
        {
          label: record.archivedAt ? (isRTL ? 'استعادة' : 'Restore') : isRTL ? 'أرشفة' : 'Archive',
          icon: record.archivedAt ? RotateCcw : Archive,
          hidden: !user?.roles.includes('admin'),
          onClick: () => void archive(),
        },
      ]}
    />
  );
}
export function CrmPagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (value: string) => void;
}) {
  const { isRTL } = useLocale();
  const max = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-4 mt-6">
      <Button variant="outline" disabled={page <= 1} onClick={() => onPage(String(page - 1))}>
        {isRTL ? 'السابق' : 'Previous'}
      </Button>
      <span className="text-sm text-gray-500">
        {page} / {max} · {total} {isRTL ? 'سجل' : 'records'}
      </span>
      <Button variant="outline" disabled={page >= max} onClick={() => onPage(String(page + 1))}>
        {isRTL ? 'التالي' : 'Next'}
      </Button>
    </div>
  );
}
