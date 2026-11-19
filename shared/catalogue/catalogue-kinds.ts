export const catalogueKinds = [
  'destinations',
  'multi-day-categories',
  'hotels',
  'rooms',
  'meals',
  'amenities',
  'travel-add-ons',
] as const;
export type CatalogueKind = (typeof catalogueKinds)[number];
