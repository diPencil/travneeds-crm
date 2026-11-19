import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  User,
  Calendar,
  Shield,
  Activity,
  Award,
  MessageSquare,
  FileText,
  Target,
  ArrowLeft,
  Download,
} from 'lucide-react';
import type { UserDetail } from '../../../shared/users/users.contracts';
import { useApiResource } from '../../lib/http/useApiResource';
import { apiRequest } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';
import { useToastContext } from '../../hooks/useToastContext';
import { useNotifications } from '../notifications/useNotifications';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';
import { AccountDialog } from '../../components/ui/AccountDialog';
import { formatDate, formatDateTime } from '../../utils/format';
import { useCsvExport } from '../../hooks/useCsvExport';
import { auditLabel } from '../audit/audit.format';
import { userLabel } from './user.labels';

export function UserDetailsPage() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const location = useLocation();
  const { user: viewer } = useAuth();
  const { isRTL } = useLocale();
  const state = location.state as { user?: { id?: string } } | null;
  const targetId = id || query.get('id') || state?.user?.id || viewer?.id;
  const resource = useApiResource<UserDetail>(
    targetId ? `/users/${encodeURIComponent(targetId)}` : null,
  );
  if (!viewer?.roles.includes('admin'))
    return <p role="alert">{isRTL ? 'غير مصرح' : 'Access denied'}</p>;
  if (!resource.data || resource.error) return <DataState {...resource} retry={resource.reload} />;
  return (
    <UserDetails key={resource.data.user.id} detail={resource.data} reload={resource.reload} />
  );
}

function UserDetails({ detail, reload }: { detail: UserDetail; reload: () => void }) {
  const exportCsv = useCsvExport();
  const { user, personal, security, performance } = detail;
  const { t, isRTL, locale } = useLocale();
  const { user: viewer, csrfToken } = useAuth();
  const toast = useToastContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [busy, setBusy] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const role = user.roles.includes('admin')
    ? isRTL
      ? 'مدير النظام'
      : 'System Administrator'
    : isRTL
      ? 'موظف'
      : 'Employee';
  const tabs = [
    { id: 'personal', label: isRTL ? 'المعلومات الشخصية' : 'Personal Info', icon: User },
    { id: 'work', label: isRTL ? 'معلومات العمل' : 'Work Info', icon: Shield },
    { id: 'security', label: isRTL ? 'الأمان' : 'Security', icon: Shield },
    { id: 'permissions', label: isRTL ? 'الصلاحيات' : 'Permissions', icon: Shield },
    { id: 'activity', label: isRTL ? 'النشاط' : 'Activity', icon: Activity },
    { id: 'performance', label: isRTL ? 'الأداء' : 'Performance', icon: Award },
  ];
  const fact = (label: string, value: ReactNode) => (
    <div key={label}>
      <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      <div className="text-gray-900 dark:text-white break-words">{value || '—'}</div>
    </div>
  );
  async function revoke() {
    if (!csrfToken) return;
    setBusy(true);
    try {
      await apiRequest(`/users/${user.id}/revoke-sessions`, {
        method: 'POST',
        body: { keepCurrent: user.id === viewer?.id },
        csrfToken,
      });
      reload();
      toast.success(isRTL ? 'تم إنهاء الجلسات المطلوبة' : 'Sessions revoked');
    } catch {
      toast.error(isRTL ? 'تعذر إنهاء الجلسات' : 'Could not revoke sessions');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="w-full pb-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2563EB] text-white p-8 rounded-3xl shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              aria-label={isRTL ? 'الرجوع للمستخدمين' : 'Back to Users'}
              onClick={() => navigate('/users')}
              className="p-2 bg-white/10 text-white border-transparent hover:bg-white/20"
            >
              <ArrowLeft size={20} className={isRTL ? 'rotate-180' : ''} />
            </Button>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white/20 shadow-inner flex-shrink-0">
                <img
                  src={`/avatar-${user.avatarGender}.png`}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{user.fullName}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">
                    {role}
                  </span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}
                  >
                    {user.status === 'active'
                      ? isRTL
                        ? 'نشط'
                        : 'Active'
                      : isRTL
                        ? 'معطل'
                        : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/4 bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm">
            <nav
              role="tablist"
              aria-label={isRTL ? 'تفاصيل المستخدم' : 'User details'}
              aria-orientation="vertical"
              className="space-y-2"
            >
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`user-tab-${tab.id}`}
                  aria-controls="user-detail-panel"
                  aria-selected={activeTab === tab.id}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onKeyDown={(event) => {
                    let next: number;
                    if (event.key === 'ArrowDown') next = (index + 1) % tabs.length;
                    else if (event.key === 'ArrowUp')
                      next = (index + tabs.length - 1) % tabs.length;
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = tabs.length - 1;
                    else return;
                    event.preventDefault();
                    setActiveTab(tabs[next].id);
                    document.getElementById(`user-tab-${tabs[next].id}`)?.focus();
                  }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center w-full px-3 py-2 text-start text-sm font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${activeTab === tab.id ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <tab.icon className="h-4 w-4 me-3" />
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
              </h2>
              <div className="space-y-2">
                <button
                  disabled={user.status !== 'active'}
                  onClick={() => setMessageOpen(true)}
                  className="w-full text-start text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{isRTL ? 'إرسال رسالة' : 'Send Message'}</span>
                </button>
                {[
                  {
                    label: isRTL ? 'فتح تذكرة دعم' : 'Open Support Ticket',
                    icon: FileText,
                    reason: isRTL
                      ? 'موديول الدعم غير مربوط حاليًا'
                      : 'Support module is not connected',
                  },
                  {
                    label: isRTL ? 'إسناد مهمة' : 'Assign Task',
                    icon: Target,
                    reason: isRTL
                      ? 'موديول المهام غير مربوط حاليًا'
                      : 'Task module is not connected',
                  },
                  {
                    label: isRTL ? 'جدولة اجتماع' : 'Schedule Meeting',
                    icon: Calendar,
                    reason: isRTL
                      ? 'خدمة التقويم غير مربوطة حاليًا'
                      : 'Calendar integration is not connected',
                  },
                ].map((action) => (
                  <div key={action.label} title={action.reason}>
                    <button
                      disabled
                      className="w-full text-start text-sm text-blue-600 dark:text-blue-400 p-2 rounded flex items-center gap-2 opacity-50"
                    >
                      <action.icon className="h-4 w-4" />
                      <span>{action.label}</span>
                    </button>
                    <span className="sr-only">{action.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div
            role="tabpanel"
            id="user-detail-panel"
            aria-labelledby={`user-tab-${activeTab}`}
            tabIndex={0}
            className="min-w-0 flex-1 bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 shadow-sm focus:outline-none"
          >
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'المعلومات الشخصية' : 'Personal Information'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fact(isRTL ? 'الاسم الكامل' : 'Full Name', user.fullName)}
                  {fact(
                    isRTL ? 'تاريخ الميلاد' : 'Date of Birth',
                    personal.dateOfBirth ? formatDate(personal.dateOfBirth, { locale }) : '—',
                  )}
                  {fact(isRTL ? 'الجنسية' : 'Nationality', personal.nationality)}
                  {fact(
                    isRTL ? 'النوع' : 'Gender',
                    personal.gender === 'unspecified'
                      ? '—'
                      : personal.gender === 'female'
                        ? isRTL
                          ? 'أنثى'
                          : 'Female'
                        : isRTL
                          ? 'ذكر'
                          : 'Male',
                  )}
                  {fact(isRTL ? 'العنوان' : 'Address', personal.address)}
                  {fact(
                    isRTL ? 'جهة اتصال الطوارئ' : 'Emergency Contact',
                    <>
                      {personal.emergencyContactName || '—'}{' '}
                      {personal.emergencyContactPhone && (
                        <bdi>({personal.emergencyContactPhone})</bdi>
                      )}
                    </>,
                  )}
                  {fact(isRTL ? 'صلة القرابة' : 'Relationship', personal.emergencyRelationship)}
                </div>
              </div>
            )}
            {activeTab === 'work' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'معلومات العمل' : 'Work Information'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fact(
                    isRTL ? 'معرّف الموظف' : 'Employee ID',
                    <bdi className="text-sm">{user.id}</bdi>,
                  )}
                  {fact(isRTL ? 'القسم' : 'Department', user.department)}
                  {fact(isRTL ? 'الدور' : 'Role', role)}
                  {fact(
                    isRTL ? 'تاريخ الانضمام' : 'Join Date',
                    formatDate(user.createdAt, { locale }),
                  )}
                  {fact(isRTL ? 'البريد الإلكتروني' : 'Email', <bdi>{user.email}</bdi>)}
                  {fact(isRTL ? 'الهاتف' : 'Phone', <bdi>{user.phone || '—'}</bdi>)}
                  {fact(
                    isRTL ? 'آخر تسجيل دخول' : 'Last Login',
                    user.lastLoginAt
                      ? formatDateTime(user.lastLoginAt, { locale })
                      : isRTL
                        ? 'لم يسجل الدخول'
                        : 'Never',
                  )}
                </div>
              </div>
            )}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'إعدادات الأمان' : 'Security Settings'}
                </h2>
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <Shield className="h-8 w-8 text-amber-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest text-xs mb-2">
                        {isRTL ? 'حماية الحساب' : 'Account Protection'}
                      </p>
                      <p className="text-sm text-amber-800/80 dark:text-amber-500/80 leading-relaxed">
                        {isRTL
                          ? 'كلمة المرور مشفّرة والجلسات محفوظة على السيرفر. المصادقة الثنائية غير مفعّلة في النظام حاليًا.'
                          : 'Passwords are hashed and sessions are stored on the server. Two-factor authentication is not configured.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    {isRTL ? 'الجلسات النشطة' : 'Active Sessions'} ({security.sessions.length})
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      !security.sessions.length ||
                      (user.id === viewer?.id && security.sessions.length < 2)
                    }
                    loading={busy}
                    onClick={() => void revoke()}
                  >
                    {user.id === viewer?.id
                      ? isRTL
                        ? 'إنهاء الجلسات الأخرى'
                        : 'Sign out other sessions'
                      : isRTL
                        ? 'إنهاء كل الجلسات'
                        : 'Revoke all sessions'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  {security.sessions.map((session, index) => (
                    <div
                      key={`${session.createdAt}-${index}`}
                      className="p-4 border border-gray-100 dark:border-gray-700 rounded-2xl space-y-4"
                    >
                      <p className="text-sm font-medium break-words">
                        {session.userAgent ||
                          (isRTL
                            ? 'لم تُسجل معلومات العميل لهذه الجلسة'
                            : 'Client information was not recorded for this session')}
                      </p>
                      {session.isCurrent && (
                        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded font-black">
                          {isRTL ? 'الجلسة الحالية' : 'CURRENT'}
                        </span>
                      )}
                      <p className="text-xs text-gray-500">
                        {isRTL ? 'البداية: ' : 'Started: '}
                        {formatDateTime(session.createdAt, { locale })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isRTL ? 'الانتهاء: ' : 'Expires: '}
                        {formatDateTime(session.expiresAt, { locale })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'permissions' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'نطاق الوصول المصرح به' : 'Authorized Access Scope'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {detail.permissions.map((permission) => (
                    <div
                      key={permission}
                      className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-transparent hover:border-blue-500/20 transition-all flex items-center gap-3"
                    >
                      <div className="h-2 w-2 flex-shrink-0 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {userLabel(permission, isRTL)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isRTL ? 'سجل النشاط' : 'Activity Intelligence'}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportCsv('user-activity.csv', [
                        ['Timestamp', 'Action', 'Module', 'Reference'],
                        ...detail.activity.map((event) => [
                          event.createdAt,
                          auditLabel(event.action, t),
                          userLabel(event.module, isRTL),
                          event.entityId,
                        ]),
                      ])
                    }
                  >
                    <Download className="w-4 h-4" />
                    {isRTL ? 'تصدير السجل' : 'Export Log'}
                  </Button>
                </div>
                <div className="space-y-0 relative before:absolute before:start-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-700">
                  {detail.activity.map((event) => (
                    <div key={event.id} className="relative ps-12 py-4">
                      <div className="absolute start-0 top-1/2 -translate-y-1/2 h-9 w-9 bg-white dark:bg-gray-800 rounded-full border-4 border-gray-50 dark:border-gray-900 flex items-center justify-center z-10">
                        <Activity className="h-3 w-3 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {auditLabel(event.action, t)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateTime(event.createdAt, { locale })} ·{' '}
                          {userLabel(event.module, isRTL)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {!detail.activity.length && (
                  <p className="text-sm text-gray-500">
                    {isRTL ? 'لا يوجد نشاط مسجل' : 'No recorded activity'}
                  </p>
                )}
              </div>
            )}
            {activeTab === 'performance' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'ملخص الأداء' : 'Performance Summary'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    {
                      value: performance.assignedLeads,
                      label: isRTL ? 'عملاء محتملون مسندون' : 'Assigned Leads',
                      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
                    },
                    {
                      value: performance.convertedLeads,
                      label: isRTL ? 'عملاء تم تحويلهم' : 'Converted Leads',
                      color: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300',
                    },
                    {
                      value: performance.assignedCustomers,
                      label: isRTL ? 'عملاء مسندون' : 'Assigned Customers',
                      color:
                        'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300',
                    },
                    {
                      value: performance.recordedEvents,
                      label: isRTL ? 'أنشطة مسجلة' : 'Recorded Events',
                      color:
                        'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300',
                    },
                  ].map((metric) => (
                    <div key={metric.label} className={`${metric.color} rounded-2xl p-4`}>
                      <div className="text-2xl font-bold">{metric.value}</div>
                      <div className="text-sm mt-1">{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {messageOpen && (
          <UserMessageDialog
            userId={user.id}
            fullName={user.fullName}
            onClose={() => setMessageOpen(false)}
            onSent={reload}
          />
        )}
      </div>
    </div>
  );
}

function UserMessageDialog({
  userId,
  fullName,
  onClose,
  onSent,
}: {
  userId: string;
  fullName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { isRTL } = useLocale();
  const { csrfToken } = useAuth();
  const { refresh } = useNotifications();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/users/${userId}/message`, {
        method: 'POST',
        body: { message },
        csrfToken,
      });
      void refresh();
      onSent();
      onClose();
    } catch {
      setError(isRTL ? 'تعذر إرسال الرسالة' : 'Could not send message');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountDialog
      title={isRTL ? 'إرسال رسالة' : 'Send Message'}
      icon={MessageSquare}
      onClose={onClose}
      className="max-w-xl"
    >
      <form onSubmit={(event) => void send(event)} className="space-y-4">
        <p className="text-sm text-gray-500">
          {fullName} ·{' '}
          {isRTL ? 'ستظهر الرسالة في إشعارات الحساب' : 'Delivered to this account’s notifications'}
        </p>
        <label htmlFor="user-message" className="block text-sm font-medium">
          {isRTL ? 'الرسالة' : 'Message'}
        </label>
        <textarea
          id="user-message"
          autoFocus
          required
          maxLength={2000}
          rows={5}
          className="w-full rounded-2xl p-4 bg-slate-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" loading={busy}>
            {isRTL ? 'إرسال' : 'Send'}
          </Button>
        </div>
      </form>
    </AccountDialog>
  );
}
