import { z } from 'zod';
import { quotationTypes } from './quotation.contracts.js';

const text = (length: number) =>
  z
    .string()
    .max(length)
    .refine((value) => !/[\p{Surrogate}]/u.test(value), 'Invalid Unicode text');
const localized = (length = 1000) => z.object({ en: text(length), ar: text(length) }).strict();
const id = z.string().uuid();
const optionalId = z.union([z.literal(''), id]);
const recordId = z.union([z.literal(''), z.string().regex(/^[1-9]\d{0,18}$/)]);
const date = z.union([z.literal(''), z.iso.date()]);
const amount = z.union([z.literal(''), z.string().regex(/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/)]);
const currency = z.string().regex(/^[A-Z]{3}$/);
const link = z.union([
  z.literal(''),
  z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  }),
]);
const rates = z
  .array(z.object({ travelers: z.number().int().min(1).max(60), price: amount }).strict())
  .max(60);
const room = z
  .object({
    id,
    name: localized(160),
    catalogueId: id.optional(),
    mealId: id.optional(),
    description: localized(10000).optional(),
    board: localized(160),
    count: z.number().int().min(1).max(60),
    adults: z.number().int().min(1).max(60),
    children: z.number().int().min(0).max(60),
    infants: z.number().int().min(0).max(60),
    childAges: z.array(z.number().int().min(0).max(17)).max(60),
    sellPerNight: amount,
    costPerNight: amount,
  })
  .strict();
const stay = z
  .object({
    id,
    name: localized(160),
    catalogueId: id.optional(),
    meals: localized(4000).optional(),
    extras: localized(4000).optional(),
    description: localized(10000),
    location: localized(),
    rating: z.enum(['', '1', '2', '3', '4', '5']),
    supplierId: recordId,
    contact: text(500),
    amenities: localized(4000),
    images: z.array(optionalId).max(12),
    checkIn: date,
    checkOut: date,
    includedInPackage: z.boolean(),
    rooms: z.array(room).max(30),
  })
  .strict();
export const quotationContentInput = z
  .object({
    type: z.enum(quotationTypes),
    title: localized(200),
    summary: localized(2000),
    location: localized(160),
    destination: localized(160),
    destinationCatalogueId: id.optional(),
    categories: z.array(text(100)).max(20),
    categoryCatalogueRefs: z
      .array(z.object({ id, name: text(100) }).strict())
      .max(20)
      .optional(),
    cruiseType: z.enum([
      '',
      'standard-nile-cruises',
      'deluxe-nile-cruise',
      'superior-nile-cruise',
      'luxury-nile-cruise',
    ]),
    departurePort: localized(160),
    duration: localized(100),
    groupSize: localized(100),
    travelStyle: localized(100),
    overview: localized(40000),
    highlightImage: optionalId,
    highlights: z
      .array(z.object({ id, title: localized(200), items: localized(6000) }).strict())
      .max(30),
    itinerary: z
      .array(
        z
          .object({
            id,
            day: localized(100),
            title: localized(200),
            description: localized(20000),
            meals: localized(500),
            mealId: id.optional(),
            image: optionalId,
          })
          .strict(),
      )
      .max(60),
    itineraryNote: localized(10000),
    included: localized(10000),
    excluded: localized(10000),
    addOns: z
      .array(
        z.object({ id, title: localized(200), price: amount, catalogueId: id.optional() }).strict(),
      )
      .max(50),
    datePrices: z
      .array(
        z
          .object({
            id,
            title: localized(200),
            startDate: date,
            endDate: date,
            price: amount,
            note: localized(2000),
            prefix: localized(100),
            tiers: z
              .array(
                z
                  .object({ id, label: localized(200), price: amount, suffix: localized(100) })
                  .strict(),
              )
              .max(30),
          })
          .strict(),
      )
      .max(30),
    gallery: z
      .array(
        z
          .object({
            id,
            mediaId: optionalId,
            alt: localized(500),
            creditLabel: text(200),
            creditUrl: link,
          })
          .strict(),
      )
      .max(24),
    videos: z
      .array(
        z
          .object({
            id,
            url: link,
            platform: z.enum(['youtube', 'instagram', 'tiktok', 'facebook', 'vimeo', 'direct']),
            title: localized(200),
            publishedOn: date,
            thumbnail: optionalId,
          })
          .strict(),
      )
      .max(30),
    locations: z
      .array(
        z
          .object({
            id,
            name: localized(200),
            latitude: z.union([
              z.literal(''),
              z
                .string()
                .refine(
                  (value) =>
                    value.trim() !== '' &&
                    Number.isFinite(Number(value)) &&
                    Math.abs(Number(value)) <= 90,
                ),
            ]),
            longitude: z.union([
              z.literal(''),
              z
                .string()
                .refine(
                  (value) =>
                    value.trim() !== '' &&
                    Number.isFinite(Number(value)) &&
                    Math.abs(Number(value)) <= 180,
                ),
            ]),
          })
          .strict(),
      )
      .max(60),
    hotels: z.array(stay).max(30),
    pricing: z
      .object({
        currency,
        basePrice: amount,
        adultRates: rates,
        childRates: rates,
        infantRates: rates,
        adults: z.number().int().min(1).max(60),
        children: z.number().int().min(0).max(60),
        infants: z.number().int().min(0).max(60),
        startDate: date,
        endDate: date,
        selectedAddOns: z.array(id).max(50),
        discountPercent: z
          .string()
          .regex(/^(0|[1-9]\d{0,2})(\.\d{1,2})?$/)
          .refine((value) => Number(value) <= 100),
        discountEndsOn: date,
        costsComplete: z.boolean(),
        costItems: z
          .array(z.object({ id, title: localized(200), supplierId: recordId, amount }).strict())
          .max(60),
      })
      .strict(),
    validUntil: date,
    terms: localized(10000),
    internalNotes: text(20000),
  })
  .strict()
  .superRefine((value, context) => {
    const unique = (rows: { id: string }[]) =>
      new Set(rows.map((row) => row.id)).size === rows.length;
    const arrays = [
      value.highlights,
      value.itinerary,
      value.addOns,
      value.datePrices,
      value.gallery,
      value.videos,
      value.locations,
      value.hotels,
      value.pricing.costItems,
      ...value.hotels.map((stay) => stay.rooms),
      ...value.datePrices.map((row) => row.tiers),
    ];
    if (arrays.some((rows) => !unique(rows)))
      context.addIssue({ code: 'custom', message: 'Duplicate row identifiers' });
    if (
      value.pricing.startDate &&
      value.pricing.endDate &&
      value.pricing.endDate < value.pricing.startDate
    )
      context.addIssue({ code: 'custom', message: 'Invalid travel date range' });
    if (value.datePrices.some((row) => row.startDate && row.endDate && row.endDate < row.startDate))
      context.addIssue({ code: 'custom', message: 'Invalid date pricing range' });
  });
export const quotationSaveInput = z
  .object({
    customerId: recordId,
    content: quotationContentInput,
    version: z.number().int().nonnegative(),
    requestKey: id,
  })
  .strict();
export const quotationListInput = z
  .object({
    search: text(160).default(''),
    status: z
      .enum(['', 'draft', 'ready', 'sent', 'accepted', 'declined', 'expired', 'booked'])
      .default(''),
    type: z.union([z.literal(''), z.enum(quotationTypes)]).default(''),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();
