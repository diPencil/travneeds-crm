import { useLocale } from '../localization/useLocale';
import { exportCsv } from '../utils/exportCsv';
import { useToastContext } from './useToastContext';

export function useCsvExport() {
  const { t } = useLocale();
  const { addToast } = useToastContext();

  return (filename: string, rows: Parameters<typeof exportCsv>[1]) => {
    exportCsv(filename, rows);
    addToast({
      type: 'success',
      title: t('common.exportStarted'),
      message: filename,
      placement: 'bottom-center',
      duration: 9000,
    });
  };
}
