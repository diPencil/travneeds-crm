import type { PoolConnection } from 'mysql2/promise';
import type { AuthUser } from '../../../../shared/auth/auth.contracts.js';
import type {
  LocalizedContent,
  QuotationContent,
} from '../../../../shared/quotations/quotation.contracts.js';
import {
  catalogueNameLimits,
  type CatalogueDetails,
  type CatalogueKind,
} from '../../../../shared/catalogue/catalogue.contracts.js';
import { HttpError } from '../../http/errors.js';
import { assertCatalogueKind, storeCatalogueEntry, linkHotelOption } from './catalogue.service.js';
const hasName = (name: LocalizedContent) => Boolean(name.en.trim() || name.ar.trim());
const lines = (value: LocalizedContent | undefined) => {
  const en =
    value?.en
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean) ?? [];
  const ar =
    value?.ar
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean) ?? [];
  // Pair translated lines only when both versions have the same number of entries.
  if (en.length !== ar.length)
    return [
      ...en.map((entry) => ({ en: entry, ar: '' })),
      ...ar.map((entry) => ({ en: '', ar: entry })),
    ];
  return en.map((entry, index) => ({ en: entry, ar: ar[index] }));
};
export async function synchroniseQuotationCatalogue(
  db: PoolConnection,
  content: QuotationContent,
  actor: AuthUser,
) {
  const ensure = async (
    kind: CatalogueKind,
    name: LocalizedContent,
    details: CatalogueDetails = {},
    hotelId: string | null = null,
    id?: string,
  ) => {
    if (id) {
      const existing = await assertCatalogueKind(db, id, kind);
      if (existing.hotelId !== hotelId) throw new HttpError(400, 'INVALID_CATALOGUE_REFERENCE');
      return existing.id;
    }
    if (!hasName(name)) return undefined;
    if (
      name.en.trim().length > catalogueNameLimits[kind] ||
      name.ar.trim().length > catalogueNameLimits[kind]
    )
      return undefined;
    return (
      await storeCatalogueEntry(
        db,
        kind,
        { name, details, hotelId, slug: '', active: true, version: 0, optionIds: [] },
        actor,
        'reuse',
      )
    ).id;
  };
  content.destinationCatalogueId = await ensure(
    'destinations',
    content.destination,
    {},
    null,
    content.destinationCatalogueId,
  );
  if (content.type === 'multi-days-tours') {
    const references = new Map(content.categoryCatalogueRefs?.map((ref) => [ref.name, ref.id]));
    content.categoryCatalogueRefs = [];
    for (const name of new Set(content.categories)) {
      const id = await ensure(
        'multi-day-categories',
        /\p{Script=Arabic}/u.test(name) ? { en: '', ar: name } : { en: name, ar: '' },
        {},
        null,
        references.get(name),
      );
      if (id) content.categoryCatalogueRefs.push({ id, name });
    }
  } else delete content.categoryCatalogueRefs;
  for (const item of content.itinerary) {
    if (item.mealId) await assertCatalogueKind(db, item.mealId, 'meals');
    else for (const name of lines(item.meals)) await ensure('meals', name);
  }
  for (const addOn of content.addOns) {
    addOn.catalogueId = await ensure(
      'travel-add-ons',
      addOn.title,
      { price: addOn.price, currency: content.pricing.currency },
      null,
      addOn.catalogueId,
    );
  }
  for (const stay of content.hotels) {
    stay.catalogueId = await ensure(
      'hotels',
      stay.name,
      {
        description: stay.description,
        location: stay.location,
        rating: stay.rating,
        supplierId: stay.supplierId,
        contact: stay.contact,
        images: stay.images.filter(Boolean),
        destinationId: content.destinationCatalogueId,
      },
      null,
      stay.catalogueId,
    );
    if (!stay.catalogueId) continue;
    for (const [kind, value] of [
      ['amenities', stay.amenities],
      ['meals', stay.meals],
      ['travel-add-ons', stay.extras],
    ] as const) {
      for (const name of lines(value)) {
        const option = await ensure(kind, name);
        if (option) await linkHotelOption(db, stay.catalogueId, option, true);
      }
    }
    for (const room of stay.rooms) {
      room.mealId = await ensure('meals', room.board, {}, null, room.mealId);
      if (room.mealId) await linkHotelOption(db, stay.catalogueId, room.mealId, true);
      room.catalogueId = await ensure(
        'rooms',
        room.name,
        {
          description: room.description,
          adults: room.adults,
          children: room.children,
          infants: room.infants,
          board: room.board,
          mealId: room.mealId,
          currency: content.pricing.currency,
          price: room.sellPerNight,
          cost: room.costPerNight,
        },
        stay.catalogueId,
        room.catalogueId,
      );
    }
  }
}
