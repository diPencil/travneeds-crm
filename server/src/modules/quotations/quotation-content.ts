import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import { HttpError } from '../../http/errors.js';
import { sanitizeRichText } from '../../http/rich-text.js';
import type {
  QuotationContent,
  LocalizedContent,
} from '../../../../shared/quotations/quotation.contracts.js';

export function sanitizeQuotationContent(content: QuotationContent): QuotationContent {
  const result = structuredClone(content);
  const rich = (value: LocalizedContent): LocalizedContent => ({
    en: sanitizeRichText(value.en),
    ar: sanitizeRichText(value.ar),
  });
  result.categories = result.categories.map((value) => value.trim()).filter(Boolean);
  result.overview = rich(result.overview);
  result.itineraryNote = rich(result.itineraryNote);
  result.itinerary = result.itinerary.map((item) => ({
    ...item,
    description: rich(item.description),
  }));
  result.hotels = result.hotels.map((stay) => ({ ...stay, description: rich(stay.description) }));
  return result;
}
export function quotationMediaIds(content: QuotationContent): string[] {
  return [
    ...new Set(
      [
        content.highlightImage,
        ...content.gallery.map((item) => item.mediaId),
        ...content.itinerary.map((item) => item.image),
        ...content.videos.map((item) => item.thumbnail),
        ...content.hotels.flatMap((stay) => stay.images),
      ].filter(Boolean),
    ),
  ];
}
export function publicQuotationContent(content: QuotationContent): QuotationContent {
  return {
    ...content,
    internalNotes: '',
    pricing: { ...content.pricing, costsComplete: false, costItems: [] },
    hotels: content.hotels.map((stay) => ({
      ...stay,
      supplierId: '',
      contact: '',
      rooms: stay.rooms.map((room) => ({ ...room, costPerNight: '' })),
    })),
  };
}

export async function validateQuotationMedia(
  database: Pool | PoolConnection,
  content: QuotationContent,
  actor: AuthUser,
) {
  let imageBytes = 0;
  for (const id of quotationMediaIds(content)) {
    const [rows] = await database.execute<RowDataPacket[]>(
      'SELECT created_by,byte_size,EXISTS(SELECT 1 FROM travel_catalogue_media WHERE media_id=m.id) AS shared FROM quotation_media m WHERE id=?',
      [id],
    );
    const media = rows[0];
    if (
      !media ||
      (!media.shared && !actor.roles.includes('admin') && media.created_by !== actor.id)
    )
      throw new HttpError(400, 'MEDIA_UNAVAILABLE');
    imageBytes += Number(media.byte_size);
    if (imageBytes > 24 * 1024 * 1024) throw new HttpError(422, 'QUOTATION_IMAGES_TOO_LARGE');
  }
}
