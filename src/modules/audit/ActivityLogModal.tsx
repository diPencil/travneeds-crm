import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useLocale } from '../../localization/useLocale';
import { apiRequest } from '../../lib/http/api';
import { formatDateTime } from '../../utils/format';

interface AuditEvent {
  id: string;
  action: string;
  createdAt: string;
}

export function ActivityLogModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return isOpen ? <ActivityLogContent onClose={onClose} /> : null;
}

function ActivityLogContent({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ events: AuditEvent[] }>('/audit/mine', { signal: controller.signal })
      .then((result) => setEvents(result.events))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <Modal isOpen onClose={onClose} title={t('common.activityLog')}>
      {failed ? (
        <p role="alert">{t('settings.failed')}</p>
      ) : !events ? (
        <p role="status">{t('common.loading')}</p>
      ) : events.length === 0 ? (
        <p>{t('audit.empty')}</p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id}>
              <p className="font-medium">
                <bdi>{event.action}</bdi>
              </p>
              <p className="description-sm">{formatDateTime(event.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
