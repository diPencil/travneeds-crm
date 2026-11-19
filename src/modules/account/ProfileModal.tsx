import { GoogleLoginButton } from '../auth/GoogleLoginButton';
import { useState } from 'react';
import { User, Edit, Save } from 'lucide-react';
import type { AuthUser } from '../../../shared/auth/auth.contracts';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { Input } from '../../components/ui/Input';
import { AccountDialog } from '../../components/ui/AccountDialog';
import { useLocale } from '../../localization/useLocale';
import { useToastContext } from '../../hooks/useToastContext';
import { formatDate } from '../../utils/format';
import { ApiError, apiRequest } from '../../lib/http/api';
import { useAuth } from '../auth/useAuth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
}

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  return isOpen && user ? <ProfileContent onClose={onClose} user={user} /> : null;
}

function ProfileContent({ onClose, user }: { onClose: () => void; user: AuthUser }) {
  const { t, isRTL } = useLocale();
  const { csrfToken, updateUser } = useAuth();
  const toast = useToastContext();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? '',
    avatarGender: user.avatarGender,
    version: user.profileVersion,
  });
  const reset = () => {
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      avatarGender: user.avatarGender,
      version: user.profileVersion,
    });
    setIsEditing(false);
  };
  const handleSave = async () => {
    if (!csrfToken) return;
    setSaving(true);
    try {
      const saved = await apiRequest<AuthUser>('/account/profile', {
        method: 'PATCH',
        body: formData,
        csrfToken,
      });
      setFormData({
        fullName: saved.fullName,
        email: saved.email,
        phone: saved.phone ?? '',
        avatarGender: saved.avatarGender,
        version: saved.profileVersion,
      });
      updateUser(saved);
      setIsEditing(false);
      toast.success(t('profile.saved'));
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.code === 'EMAIL_IN_USE'
          ? t('profile.emailInUse')
          : error instanceof ApiError && error.code === 'PROFILE_CONFLICT'
            ? t('profile.conflict')
            : t('settings.failed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountDialog
      title={t('common.myProfile')}
      icon={User}
      onClose={onClose}
      className="max-w-2xl"
    >
      <div className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-700 shadow-sm flex-shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
          <UserAvatar gender={formData.avatarGender} alt={user.fullName} className="w-20 h-20" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{user.fullName}</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {user.roles.map((role) => t(`auth.role.${role}`)).join(' / ')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('profile.memberSince')} {formatDate(user.createdAt)}
          </p>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              id="profile-name"
              label={t('auth.fullName')}
              value={formData.fullName}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, fullName: event.target.value }))
              }
              disabled={!isEditing || saving}
              required
              maxLength={160}
            />
            <Input
              id="profile-email"
              type="email"
              label={t('auth.email')}
              value={formData.email}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, email: event.target.value }))
              }
              disabled={!isEditing || saving}
              required
              maxLength={254}
            />
            <Input
              id="profile-phone"
              type="tel"
              label={t('profile.phone')}
              value={formData.phone}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, phone: event.target.value }))
              }
              disabled={!isEditing || saving}
              maxLength={30}
            />
          </div>
          <div className="space-y-4">
            <Select
              id="profile-avatar"
              label={isRTL ? 'الافتار الافتراضي' : 'Default avatar'}
              value={formData.avatarGender}
              disabled={!isEditing || saving}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  avatarGender: event.target.value as 'male' | 'female',
                }))
              }
            >
              <option value="male">{isRTL ? 'ذكر' : 'Male'}</option>
              <option value="female">{isRTL ? 'أنثى' : 'Female'}</option>
            </Select>
            <Input
              id="profile-department"
              label={t('profile.department')}
              value={user.department ?? ''}
              disabled
            />
            <Input
              id="profile-role"
              label={t('auth.role')}
              value={user.roles.map((role) => t(`auth.role.${role}`)).join(' / ')}
              disabled
            />
            <div>
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.status')}
              </p>
              <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                {t('profile.active')}
              </span>
            </div>
          </div>
        </div>
        {!isEditing && (
          <div className="mt-5">
            <GoogleLoginButton link />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          {isEditing ? (
            <>
              <Button type="button" variant="outline" disabled={saving} onClick={reset}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="h-4 w-4" />
                {t('profile.save')}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
              {t('profile.edit')}
            </Button>
          )}
        </div>
      </form>
    </AccountDialog>
  );
}
