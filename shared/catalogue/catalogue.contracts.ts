import { z } from 'zod';
import type { LocalizedContent } from '../quotations/quotation.contracts.js';

import type { CatalogueKind } from './catalogue-kinds.js';
export { catalogueKinds, type CatalogueKind } from './catalogue-kinds.js';
export const hotelOptionKinds = ['meals', 'amenities', 'travel-add-ons'] as const;
export const catalogueNameLimits: Record<CatalogueKind, number> = {
  destinations: 160,
  'multi-day-categories': 100,
  hotels: 160,
  rooms: 160,
  meals: 160,
  amenities: 200,
  'travel-add-ons': 200,
};
export const catalogueNames: Record<CatalogueKind, [string, string]> = {
  destinations: ['Destinations', 'الوجهات'],
  'multi-day-categories': ['Multi Day Categories', 'فئات الرحلات متعددة الأيام'],
  hotels: ['Hotels', 'الفنادق'],
  rooms: ['Rooms', 'الغرف'],
  meals: ['Meals', 'الوجبات'],
  amenities: ['Amenities', 'المرافق والخدمات'],
  'travel-add-ons': ['Travel Add-ons', 'إضافات السفر'],
};
const localized = (length: number) =>
  z.object({ en: z.string().max(length), ar: z.string().max(length) }).strict();
const amount = z.string().regex(/^(?:|(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?)$/);
export const catalogueDetailsInput = z
  .object({
    description: localized(10000).optional(),
    location: localized(160).optional(),
    rating: z.enum(['', '1', '2', '3', '4', '5']).optional(),
    supplierId: z
      .string()
      .regex(/^(?:|[1-9]\d{0,18})$/)
      .optional(),
    contact: z.string().max(500).optional(),
    destinationId: z.uuid().optional(),
    images: z.array(z.uuid()).max(12).optional(),
    displayOrder: z.number().int().min(0).max(100000).optional(),
    showInOneDayTours: z.boolean().optional(),
    showInDestinations: z.boolean().optional(),
    adults: z.number().int().min(1).max(60).optional(),
    children: z.number().int().min(0).max(60).optional(),
    infants: z.number().int().min(0).max(60).optional(),
    board: localized(160).optional(),
    mealId: z.uuid().optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    price: amount.optional(),
    cost: amount.optional(),
  })
  .strict();
export type CatalogueDetails = z.infer<typeof catalogueDetailsInput>;
export const catalogueSaveInput = z
  .object({
    name: localized(200).refine((value) => Boolean(value.en.trim() || value.ar.trim())),
    slug: z.union([
      z.literal(''),
      z
        .string()
        .max(80)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    ]),
    hotelId: z.uuid().nullable(),
    active: z.boolean(),
    details: catalogueDetailsInput,
    optionIds: z.array(z.uuid()).max(150),
    linkHotelId: z.uuid().optional(),
    version: z.number().int().nonnegative(),
  })
  .strict();
export type CatalogueInput = z.infer<typeof catalogueSaveInput>;
export interface CatalogueEntry extends Omit<CatalogueInput, 'optionIds'> {
  id: string;
  kind: CatalogueKind;
}
export interface CatalogueHotel {
  hotel: CatalogueEntry;
  rooms: CatalogueEntry[];
  options: CatalogueEntry[];
}
export interface CatalogueSelection {
  destinations: CatalogueEntry[];
  'multi-day-categories': CatalogueEntry[];
  hotels: CatalogueEntry[];
  meals: CatalogueEntry[];
  amenities: CatalogueEntry[];
  'travel-add-ons': CatalogueEntry[];
}
export function catalogueName(name: LocalizedContent, language: 'ar' | 'en') {
  return name[language] || name[language === 'ar' ? 'en' : 'ar'];
}
