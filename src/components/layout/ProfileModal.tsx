import type { AuthUser } from '../../../shared/auth/auth.contracts';
import { Modal } from '../ui/Modal';
import { useLocale } from '../../localization/useLocale';
import { formatDate } from '../../utils/format';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
}

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const { t } = useLocale();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('common.myProfile')}>
      {user && (
        <dl className="space-y-5">
          <div>
            <dt className="description-sm">{t('auth.fullName')}</dt>
            <dd className="mt-1 font-semibold">{user.fullName}</dd>
          </div>
          <div>
            <dt className="description-sm">{t('auth.email')}</dt>
            <dd className="mt-1">
              <bdi>{user.email}</bdi>
            </dd>
          </div>
          <div>
            <dt className="description-sm">{t('auth.role')}</dt>
            <dd className="mt-1">{user.roles.map((role) => t(`auth.role.${role}`)).join(' / ')}</dd>
          </div>
          <div>
            <dt className="description-sm">{t('auth.createdAt')}</dt>
            <dd className="mt-1">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      )}
    </Modal>
  );
}
