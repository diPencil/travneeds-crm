import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mail, Copy, X } from 'lucide-react';
import type { Invitation } from '../../../shared/users/users.contracts';
import { apiRequest } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';
import { formatDateTime } from '../../utils/format';

export function InvitationsPage() {
  const { user, csrfToken } = useAuth();
  const { isRTL } = useLocale();
  const resource = useApiResource<Invitation[]>('/users/invitations');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: 'employee',
    avatarGender: 'male',
  });
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!user?.roles.includes('admin'))
    return <PageHeader title={isRTL ? 'غير مصرح' : 'Access denied'} />;
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setBusy(true);
    setError('');
    setLink('');
    try {
      const result = await apiRequest<{ token: string }>('/users/invitations', {
        method: 'POST',
        body: form,
        csrfToken,
      });
      setLink(`${window.location.origin}/invitation/${result.token}`);
      resource.reload();
    } catch {
      setError(
        isRTL
          ? 'تعذر إنشاء الدعوة. تحقق من البريد والبيانات.'
          : 'Could not create invitation. Check the email and details.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    if (!csrfToken) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/users/invitations/${id}`, { method: 'DELETE', csrfToken });
      resource.reload();
    } catch {
      setError(isRTL ? 'تعذر إلغاء الدعوة' : 'Could not revoke invitation');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-container">
      <PageHeader
        title={isRTL ? 'دعوة مستخدم' : 'Invite User'}
        description={
          isRTL
            ? 'إنشاء رابط قبول صالح لمدة 72 ساعة'
            : 'Create an acceptance link valid for 72 hours'
        }
      />
      <Card>
        <CardContent>
          <form onSubmit={(event) => void create(event)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input
                id="invite-name"
                required
                maxLength={160}
                label={isRTL ? 'الاسم الكامل' : 'Full Name'}
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
              <Input
                id="invite-email"
                required
                type="email"
                maxLength={254}
                label={isRTL ? 'البريد الإلكتروني' : 'Email'}
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <Select
                id="invite-role"
                label={isRTL ? 'الدور' : 'Role'}
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="employee">{isRTL ? 'موظف' : 'Employee'}</option>
                <option value="admin">{isRTL ? 'مدير النظام' : 'Administrator'}</option>
              </Select>
              <Select
                id="invite-avatar"
                label={isRTL ? 'الافتار' : 'Avatar'}
                value={form.avatarGender}
                onChange={(event) => setForm({ ...form, avatarGender: event.target.value })}
              >
                <option value="male">{isRTL ? 'ذكر' : 'Male'}</option>
                <option value="female">{isRTL ? 'أنثى' : 'Female'}</option>
              </Select>
            </div>
            <p className="text-sm text-gray-500">
              {isRTL
                ? 'انسخ الرابط وشاركه مع الشخص المقصود. لا يتم إرسال بريد تلقائي.'
                : 'Copy the link and share it with the intended recipient. Email delivery is not configured.'}
            </p>
            <Button type="submit" loading={busy}>
              <Mail className="w-4 h-4" />
              {isRTL ? 'إنشاء الدعوة' : 'Create Invitation'}
            </Button>
          </form>
          {link && (
            <div className="mt-6 space-y-3">
              <Input
                id="invite-link"
                label={isRTL ? 'رابط الدعوة — يظهر مرة واحدة' : 'Invitation link — shown once'}
                readOnly
                value={link}
              />
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                  } catch {
                    setError(
                      isRTL
                        ? 'انسخ الرابط يدويًا من الحقل'
                        : 'Copy the link manually from the field',
                    );
                  }
                }}
              >
                <Copy className="w-4 h-4" />
                {isRTL ? 'نسخ' : 'Copy'}
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-red-600 mt-4">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="table-container mt-6">
        <table className="table-premium">
          <thead>
            <tr>
              <th>{isRTL ? 'الاسم' : 'Name'}</th>
              <th>{isRTL ? 'البريد' : 'Email'}</th>
              <th>{isRTL ? 'انتهاء الصلاحية' : 'Expires'}</th>
              <th>{isRTL ? 'الحالة' : 'Status'}</th>
              <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {!resource.error &&
              resource.data?.map((item) => (
                <tr key={item.id}>
                  <td>{item.fullName}</td>
                  <td className="bidi-isolate">{item.email}</td>
                  <td>{formatDateTime(item.expiresAt)}</td>
                  <td>
                    {item.acceptedAt
                      ? isRTL
                        ? 'مقبولة'
                        : 'Accepted'
                      : item.revokedAt
                        ? isRTL
                          ? 'ملغاة'
                          : 'Revoked'
                        : new Date(`${item.expiresAt.replace(' ', 'T')}Z`) < new Date()
                          ? isRTL
                            ? 'منتهية'
                            : 'Expired'
                          : isRTL
                            ? 'معلقة'
                            : 'Pending'}
                  </td>
                  <td>
                    {!item.acceptedAt && !item.revokedAt && (
                      <Button
                        variant="ghost"
                        aria-label={isRTL ? 'إلغاء الدعوة' : 'Revoke invitation'}
                        disabled={busy}
                        onClick={() => void revoke(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <DataState {...resource} empty={!resource.data?.length} retry={resource.reload} />
      </div>
    </div>
  );
}

export function AcceptInvitationPage() {
  const { token = '' } = useParams();
  const { isRTL } = useLocale();
  const resource = useApiResource<{ fullName: string }>(
    `/invitations/${encodeURIComponent(token)}`,
  );
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function accept(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/invitations/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        body: { password },
      });
      setDone(true);
      setPassword('');
      setConfirm('');
    } catch {
      setError(
        isRTL
          ? 'تعذر قبول الدعوة. قد تكون منتهية أو مستخدمة.'
          : 'Could not accept invitation. It may have expired or already been used.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardContent>
          <h1 className="text-2xl font-bold mb-6">{isRTL ? 'قبول الدعوة' : 'Accept Invitation'}</h1>
          {done ? (
            <>
              <p>{isRTL ? 'تم إنشاء حسابك.' : 'Your account is ready.'}</p>
              <Link className="text-blue-600" to="/login">
                {isRTL ? 'تسجيل الدخول' : 'Sign in'}
              </Link>
            </>
          ) : resource.data && !resource.error ? (
            <form onSubmit={(event) => void accept(event)} className="space-y-6">
              <p>{resource.data.fullName}</p>
              <Input
                id="accept-password"
                label={
                  isRTL ? 'كلمة المرور (12 حرفًا على الأقل)' : 'Password (at least 12 characters)'
                }
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                id="accept-confirm"
                label={isRTL ? 'تأكيد كلمة المرور' : 'Confirm password'}
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
              {error && (
                <p role="alert" className="text-red-600">
                  {error}
                </p>
              )}
              <Button type="submit" loading={busy}>
                {isRTL ? 'إنشاء حسابي' : 'Create my account'}
              </Button>
            </form>
          ) : (
            <DataState {...resource} retry={resource.reload} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
