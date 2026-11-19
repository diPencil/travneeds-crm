import { useLocale } from '../../localization/useLocale';
import { Button } from './Button';

export function DataState({
  loading,
  error,
  empty,
  retry,
}: {
  loading: boolean;
  error: boolean;
  empty?: boolean;
  retry: () => void;
}) {
  const { isRTL } = useLocale();
  if (loading)
    return (
      <p role="status" className="p-8 text-center text-gray-500">
        {isRTL ? 'جارٍ التحميل…' : 'Loading…'}
      </p>
    );
  if (error)
    return (
      <div role="alert" className="p-8 text-center space-y-3 text-red-600">
        <p>{isRTL ? 'تعذر تحميل البيانات' : 'Could not load data'}</p>
        <Button variant="outline" onClick={retry}>
          {isRTL ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </div>
    );
  if (empty)
    return (
      <p className="p-12 text-center text-gray-500">
        {isRTL ? 'لا توجد سجلات مطابقة' : 'No matching records'}
      </p>
    );
  return null;
}
