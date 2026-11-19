import type {
  CatalogueHotel,
  CatalogueSelection,
} from '../../../shared/catalogue/catalogue.contracts';
import {
  emptyLocalized,
  type LocalizedContent,
  type QuotationHotel,
} from '../../../shared/quotations/quotation.contracts';

export function appendCatalogueNames(
  base: LocalizedContent,
  names: LocalizedContent[],
): LocalizedContent {
  const locale = (key: 'en' | 'ar') =>
    [
      ...new Set([...base[key].split('\n'), ...names.map((name) => name[key])].filter(Boolean)),
    ].join('\n');
  return { en: locale('en'), ar: locale('ar') };
}
export function hotelQuotationDefaults(
  bundle: CatalogueHotel,
  selection: CatalogueSelection,
  currency: string,
): Partial<QuotationHotel> {
  const details = bundle.hotel.details;
  const linked = (kind: 'meals' | 'amenities' | 'travel-add-ons') =>
    appendCatalogueNames(
      emptyLocalized(),
      bundle.options.filter((item) => item.kind === kind).map((item) => item.name),
    );
  return {
    catalogueId: bundle.hotel.id,
    name: bundle.hotel.name,
    description: details.description ?? emptyLocalized(),
    location:
      details.location ??
      selection.destinations.find((item) => item.id === details.destinationId)?.name ??
      emptyLocalized(),
    rating: details.rating ?? '',
    supplierId: details.supplierId ?? '',
    contact: details.contact ?? '',
    images: details.images ?? [],
    amenities: linked('amenities'),
    meals: linked('meals'),
    extras: linked('travel-add-ons'),
    rooms: bundle.rooms.slice(0, 30).map((item) => {
      const data = item.details,
        matches = data.currency === currency;
      return {
        id: crypto.randomUUID(),
        catalogueId: item.id,
        mealId: data.mealId,
        name: item.name,
        description: data.description,
        board:
          selection.meals.find((meal) => meal.id === data.mealId)?.name ??
          data.board ??
          emptyLocalized(),
        count: 1,
        adults: data.adults ?? 2,
        children: data.children ?? 0,
        infants: data.infants ?? 0,
        childAges: [],
        sellPerNight: matches ? (data.price ?? '') : '',
        costPerNight: matches ? (data.cost ?? '') : '',
      };
    }),
  };
}
