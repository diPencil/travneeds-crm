import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Edit,
  Eye,
  Download,
  Users,
  Activity,
  Shield,
  ShieldCheck,
  UserPlus,
  Mail,
  Key,
} from 'lucide-react';
import type { UserDirectory } from '../../../shared/users/users.contracts';
import { useApiResource } from '../../lib/http/useApiResource';
import { apiRequest } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';
import { useToastContext } from '../../hooks/useToastContext';
import { Card, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { TableActionsDropdown } from '../../components/ui/TableActionsDropdown';
import { DataState } from '../../components/ui/DataState';
import { useCsvExport } from '../../hooks/useCsvExport';
import { formatDate } from '../../utils/format';

export function UsersPage() {
  const exportCsv = useCsvExport();
  const { user, csrfToken } = useAuth();
  const { isRTL } = useLocale();
  const navigate = useNavigate();
  const toast = useToastContext();
  const resource = useApiResource<UserDirectory>('/users');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  if (!user?.roles.includes('admin'))
    return <PageHeader title={isRTL ? 'غير مصرح' : 'Access denied'} />;
  const users = (resource.data?.users ?? []).filter(
    (item) =>
      `${item.fullName} ${item.email}`.toLowerCase().includes(search.toLowerCase()) &&
      (!role || item.roles.includes(role as 'admin' | 'employee')),
  );
  const metrics = resource.data?.metrics;
  async function revoke(id: string) {
    if (!csrfToken) return;
    try {
      await apiRequest(`/users/${id}/revoke-sessions`, { method: 'POST', body: {}, csrfToken });
      resource.reload();
      toast.success(isRTL ? 'تم إنهاء الجلسات' : 'Sessions revoked');
    } catch {
      toast.error(isRTL ? 'تعذر إنهاء الجلسات' : 'Could not revoke sessions');
    }
  }
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader
          title={isRTL ? 'الهوية والصلاحيات' : 'Identity & Access'}
          description={
            isRTL
              ? 'إدارة الفريق والحسابات وصلاحيات النظام'
              : 'Manage team hierarchy, security credentials, and system access'
          }
          actions={
            <>
              <Button
                variant="outline"
                className="bg-white/10 text-white border-transparent hover:bg-white/20"
                onClick={() => navigate('/users/roles')}
              >
                <Shield className="h-4 w-4" />
                {isRTL ? 'الأدوار' : 'Roles'}
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 text-white border-transparent hover:bg-white/20"
                onClick={() => navigate('/users/invite')}
              >
                <Mail className="h-4 w-4" />
                {isRTL ? 'دعوة' : 'Invite'}
              </Button>
              <Button
                className="bg-white text-blue-600 hover:bg-blue-50"
                onClick={() => navigate('/users/new')}
              >
                <UserPlus className="h-4 w-4" />
                {isRTL ? 'إضافة مستخدم' : 'Add User'}
              </Button>
            </>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            label={isRTL ? 'إجمالي الفريق' : 'Total Team'}
            value={metrics?.total ?? '—'}
            icon={Users}
            iconColor="text-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            label={isRTL ? 'الجلسات النشطة' : 'Active Sessions'}
            value={metrics?.activeSessions ?? '—'}
            icon={Activity}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <StatCard
            label={isRTL ? 'المديرون النشطون' : 'Admin Roles'}
            value={metrics?.admins ?? '—'}
            icon={ShieldCheck}
            iconColor="text-purple-500"
            iconBg="bg-purple-50 dark:bg-purple-900/20"
          />
          <StatCard
            label={isRTL ? 'دعوات معلقة' : 'Pending Invites'}
            value={metrics?.pendingInvites ?? '—'}
            icon={Mail}
            iconColor="text-amber-500"
            iconBg="bg-amber-50 dark:bg-amber-900/20"
          />
        </div>
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  aria-label={isRTL ? 'بحث الفريق' : 'Search team'}
                  placeholder={isRTL ? 'ابحث بالاسم أو البريد…' : 'Search team by name or email...'}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="ps-10"
                />
              </div>
              <Select
                aria-label={isRTL ? 'تصفية الدور' : 'Filter role'}
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-full md:w-64"
              >
                <option value="">{isRTL ? 'كل الأدوار' : 'All Roles'}</option>
                <option value="admin">{isRTL ? 'مدير النظام' : 'Administrator'}</option>
                <option value="employee">{isRTL ? 'موظف' : 'Employee'}</option>
              </Select>
              <Button
                variant="outline"
                disabled={!resource.data || resource.error}
                onClick={() =>
                  exportCsv('users.csv', [
                    ['Name', 'Email', 'Role', 'Department', 'Status'],
                    ...users.map((item) => [
                      item.fullName,
                      item.email,
                      item.roles.join(' / '),
                      item.department,
                      item.status,
                    ]),
                  ])
                }
              >
                <Download className="h-4 w-4" />
                {isRTL ? 'تصدير' : 'Export'}
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="table-container">
          <table className="table-premium">
            <thead>
              <tr>
                {(isRTL
                  ? ['المستخدم', 'المؤسسة', 'صلاحيات النظام', 'النشاط', 'الحالة', 'الإجراءات']
                  : [
                      'User Profile',
                      'Organization',
                      'System Access',
                      'Activity',
                      'Status',
                      'Actions',
                    ]
                ).map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!resource.error &&
                users.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
                          <img
                            src={`/avatar-${item.avatarGender}.png`}
                            alt={item.fullName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-bold">{item.fullName}</div>
                          <div className="text-[10px] text-gray-500 bidi-isolate">{item.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-medium">{item.jobTitle || '—'}</div>
                      <div className="text-[10px] text-gray-500">{item.department || '—'}</div>
                    </td>
                    <td>
                      {item.roles.map((value) => (
                        <span
                          key={value}
                          className="text-[9px] font-bold uppercase bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400"
                        >
                          {value === 'admin'
                            ? isRTL
                              ? 'مدير'
                              : 'Administrator'
                            : isRTL
                              ? 'موظف'
                              : 'Employee'}
                        </span>
                      ))}
                    </td>
                    <td>
                      <div className="text-xs">
                        {item.lastLoginAt
                          ? `${isRTL ? 'آخر دخول: ' : 'Last login: '}${formatDate(item.lastLoginAt)}`
                          : isRTL
                            ? 'لم يسجل الدخول'
                            : 'Never signed in'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {isRTL ? 'انضم ' : 'Joined '}
                        {formatDate(item.createdAt)}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge-standard ${item.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/20'}`}
                      >
                        {item.status === 'active'
                          ? isRTL
                            ? 'نشط'
                            : 'Active'
                          : isRTL
                            ? 'معطل'
                            : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <TableActionsDropdown
                        actions={[
                          {
                            label: isRTL ? 'عرض الملف' : 'View Profile',
                            icon: Eye,
                            onClick: () => navigate(`/users/${item.id}`),
                          },
                          {
                            label: isRTL ? 'تعديل الحساب' : 'Edit Settings',
                            icon: Edit,
                            onClick: () => navigate(`/users/${item.id}/edit`),
                          },
                          {
                            label: isRTL ? 'إنهاء الجلسات' : 'Revoke Sessions',
                            icon: Key,
                            hidden: item.id === user.id,
                            onClick: () => void revoke(item.id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <DataState
            loading={resource.loading}
            error={resource.error}
            empty={!users.length}
            retry={resource.reload}
          />
        </div>
      </div>
    </div>
  );
}
