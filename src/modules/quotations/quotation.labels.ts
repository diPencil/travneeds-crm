import { useCallback } from 'react';
import { useLocale } from '../../localization/useLocale';
const labels: Record<string, [string, string]> = {
  'one-day-tours': ['One Day Tour', 'رحلة يوم واحد'],
  'multi-days-tours': ['Multi-Day Journey', 'رحلة متعددة الأيام'],
  'nile-cruises': ['Nile Cruise', 'نايل كروز'],
  'shore-excursions': ['Shore Excursion', 'رحلة من الميناء'],
  draft: ['Draft', 'مسودة'],
  ready: ['Ready', 'جاهز'],
  sent: ['Shared', 'تمت مشاركته'],
  accepted: ['Accepted', 'مقبول'],
  declined: ['Declined', 'مرفوض'],
  expired: ['Expired', 'منتهي'],
  booked: ['Booked', 'تم الحجز'],
  basic: ['Basic & Customer', 'الأساسيات والعميل'],
  pricing: ['Booking Pricing', 'تسعير الحجز'],
  addons: ['Add-ons', 'الإضافات'],
  overview: ['Overview', 'نظرة عامة'],
  highlights: ['Highlights', 'أبرز المعالم'],
  itinerary: ['Itinerary', 'البرنامج'],
  hotels: ['Hotels & Rooms', 'الفنادق والغرف'],
  inclusions: ['Inclusions', 'المشمول'],
  dates: ['Date Pricing', 'أسعار الفترات'],
  media: ['Media', 'الوسائط'],
  map: ['Map', 'الخريطة'],
  review: ['Review', 'المراجعة'],
  'standard-nile-cruises': ['Standard', 'ستاندرد'],
  'deluxe-nile-cruise': ['Deluxe', 'ديلوكس'],
  'superior-nile-cruise': ['Superior', 'سوبيريور'],
  'luxury-nile-cruise': ['Luxury', 'فاخر'],
};
export function useQuotationText() {
  const locale = useLocale();
  const text = useCallback((en: string, ar: string) => (locale.isRTL ? ar : en), [locale.isRTL]);
  const label = useCallback(
    (key: string) => labels[key]?.[locale.isRTL ? 1 : 0] ?? key,
    [locale.isRTL],
  );
  return { ...locale, text, label };
}
