import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import type {
  ManagedUser,
  UserDetails,
  UserDetail,
  PersonalInformation,
} from '../../../shared/users/users.contracts';
import { apiRequest, ApiError } from '../../lib/http/api';
import { useApiResource } from '../../lib/http/useApiResource';
import { useAuth } from '../auth/useAuth';
import { useLocale } from '../../localization/useLocale';
import { useToastContext } from '../../hooks/useToastContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/ui/DataState';

export function UserFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { isRTL } = useLocale();
  const resource = useApiResource<UserDetail>(id ? `/users/${encodeURIComponent(id)}` : null);
  if (!user?.roles.includes('admin'))
    return <PageHeader title={isRTL ? 'غير مصرح' : 'Access denied'} />;
  if (id && (!resource.data || resource.error))
    return <DataState {...resource} retry={resource.reload} />;
  const existing = resource.data?.user;
  if (id && !existing)
    return <PageHeader title={isRTL ? 'الحساب غير موجود' : 'Account not found'} />;
  return (
    <UserForm
      key={id || 'new'}
      existing={existing}
      personal={resource.data?.personal}
      readOnly={readOnly}
    />
  );
}

function UserForm({
  existing,
  personal,
  readOnly,
}: {
  existing?: ManagedUser;
  personal?: PersonalInformation;
  readOnly: boolean;
}) {
  const { isRTL } = useLocale();
  const { csrfToken, user, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToastContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [details, setDetails] = useState<UserDetails>({
    fullName: existing?.fullName ?? '',
    email: existing?.email ?? '',
    phone: existing?.phone ?? '',
    department: existing?.department ?? '',
    jobTitle: existing?.jobTitle ?? '',
    avatarGender: existing?.avatarGender ?? 'male',
    role: existing?.roles.includes('admin') ? 'admin' : 'employee',
    status: existing?.status ?? 'active',
    dateOfBirth: personal?.dateOfBirth ?? '',
    nationality: personal?.nationality ?? '',
    gender: personal?.gender ?? 'unspecified',
    address: personal?.address ?? '',
    emergencyContactName: personal?.emergencyContactName ?? '',
    emergencyContactPhone: personal?.emergencyContactPhone ?? '',
    emergencyRelationship: personal?.emergencyRelationship ?? '',
  });
  const self = user?.id === existing?.id;
  const field = (
    key: keyof UserDetails,
    label: string,
    type = 'text',
    required = false,
    maxLength = 120,
  ) => (
    <Input
      id={`user-${key}`}
      key={key}
      label={label}
      type={type}
      value={details[key]}
      required={required}
      maxLength={maxLength}
      max={type === 'date' ? new Date().toISOString().slice(0, 10) : undefined}
      disabled={readOnly || saving}
      onChange={(event) => setDetails((value) => ({ ...value, [key]: event.target.value }))}
    />
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest(existing ? `/users/${existing.id}` : '/users', {
        method: existing ? 'PATCH' : 'POST',
        body: existing ? { ...details, version: existing.version } : { ...details, password },
        csrfToken,
      });
      if (self) await refresh();
      toast.success(isRTL ? 'تم حفظ الحساب' : 'Account saved');
      navigate('/users');
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.code === 'EMAIL_IN_USE'
          ? isRTL
            ? 'البريد مستخدم بالفعل'
            : 'Email is already in use'
          : failure instanceof ApiError && failure.code === 'VERSION_CONFLICT'
            ? isRTL
              ? 'الحساب اتغير. ارجع وافتحه من جديد.'
              : 'Account changed. Reopen it before saving.'
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
      <div className="mx-auto max-w-[1000px] space-y-6">
        <PageHeader
          title={
            readOnly
              ? isRTL
                ? 'ملف المستخدم'
                : 'User Profile'
              : existing
                ? isRTL
                  ? 'تعديل المستخدم'
                  : 'Edit User'
                : isRTL
                  ? 'إضافة مستخدم'
                  : 'Add User'
          }
          actions={
            <Button className="bg-white/10 text-white" onClick={() => navigate('/users')}>
              <ArrowLeft className="h-4 w-4" />
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
          }
        />
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={(event) => void save(event)}>
            <div className="flex flex-col items-center mb-8">
              <img
                src={`/avatar-${details.avatarGender}.png`}
                alt={isRTL ? 'معاينة الافتار' : 'Avatar Preview'}
                className="w-24 h-24 rounded-full border-4 border-blue-50 dark:border-gray-800 shadow-md object-cover"
              />
              <p className="mt-4 text-sm font-medium text-gray-500">
                {isRTL ? 'الافتار الافتراضي حسب الاختيار' : 'Avatar assigned automatically'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {field('fullName', isRTL ? 'الاسم الكامل' : 'Full Name', 'text', true, 160)}
              {field('email', isRTL ? 'البريد الإلكتروني' : 'Email', 'email', true, 254)}
              {field('phone', isRTL ? 'الهاتف' : 'Phone', 'tel', false, 30)}
              {field('jobTitle', isRTL ? 'المسمى الوظيفي' : 'Job Title')}
              {field('department', isRTL ? 'القسم' : 'Department')}
              <Select
                id="user-avatar"
                label={isRTL ? 'الافتار' : 'Avatar'}
                value={details.avatarGender}
                disabled={readOnly || saving}
                onChange={(event) =>
                  setDetails({ ...details, avatarGender: event.target.value as 'male' | 'female' })
                }
              >
                <option value="male">{isRTL ? 'ذكر' : 'Male'}</option>
                <option value="female">{isRTL ? 'أنثى' : 'Female'}</option>
              </Select>
              <Select
                id="user-role"
                label={isRTL ? 'الدور' : 'Role'}
                value={details.role}
                disabled={readOnly || saving || self}
                onChange={(event) =>
                  setDetails({ ...details, role: event.target.value as 'admin' | 'employee' })
                }
              >
                <option value="employee">{isRTL ? 'موظف' : 'Employee'}</option>
                <option value="admin">{isRTL ? 'مدير النظام' : 'Administrator'}</option>
              </Select>
              <Select
                id="user-status"
                label={isRTL ? 'الحالة' : 'Status'}
                value={details.status}
                disabled={readOnly || saving || self}
                onChange={(event) =>
                  setDetails({ ...details, status: event.target.value as 'active' | 'disabled' })
                }
              >
                <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
                <option value="disabled">{isRTL ? 'معطل' : 'Disabled'}</option>
              </Select>
              {field('dateOfBirth', isRTL ? 'تاريخ الميلاد' : 'Date of Birth', 'date', false, 10)}
              {field('nationality', isRTL ? 'الجنسية' : 'Nationality', 'text', false, 100)}
              <Select
                id="user-gender"
                label={
                  isRTL ? 'النوع (معلومة شخصية اختيارية)' : 'Gender (optional personal information)'
                }
                value={details.gender}
                disabled={readOnly || saving}
                onChange={(event) =>
                  setDetails({ ...details, gender: event.target.value as UserDetails['gender'] })
                }
              >
                <option value="unspecified">{isRTL ? 'غير محدد' : 'Not specified'}</option>
                <option value="male">{isRTL ? 'ذكر' : 'Male'}</option>
                <option value="female">{isRTL ? 'أنثى' : 'Female'}</option>
              </Select>
              {field('address', isRTL ? 'العنوان' : 'Address', 'text', false, 500)}
              {field(
                'emergencyContactName',
                isRTL ? 'اسم جهة اتصال الطوارئ' : 'Emergency Contact Name',
                'text',
                false,
                160,
              )}
              {field(
                'emergencyContactPhone',
                isRTL ? 'هاتف الطوارئ' : 'Emergency Contact Phone',
                'tel',
                false,
                30,
              )}
              {field(
                'emergencyRelationship',
                isRTL ? 'صلة القرابة' : 'Relationship',
                'text',
                false,
                60,
              )}
              {!existing && (
                <Input
                  id="new-user-password"
                  label={
                    isRTL ? 'كلمة المرور (12 حرفًا على الأقل)' : 'Password (at least 12 characters)'
                  }
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </div>
            {error && (
              <p role="alert" className="mt-4 text-red-600">
                {error}
              </p>
            )}
            {!readOnly && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => navigate('/users')}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" loading={saving}>
                  <Save className="h-4 w-4" />
                  {isRTL ? 'حفظ المستخدم' : 'Save User'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
