import type { CatalogueSelection } from '../catalogue/catalogue.contracts.js';

export const quotationTypes = [
  'one-day-tours',
  'multi-days-tours',
  'nile-cruises',
  'shore-excursions',
] as const;
export type QuotationType = (typeof quotationTypes)[number];
export const quotationStatuses = [
  'draft',
  'ready',
  'sent',
  'accepted',
  'declined',
  'expired',
  'booked',
] as const;
export type QuotationStatus = (typeof quotationStatuses)[number];
export interface LocalizedContent {
  en: string;
  ar: string;
}
export interface PassengerRate {
  travelers: number;
  price: string;
}
export interface QuotationRoom {
  id: string;
  catalogueId?: string;
  mealId?: string;
  description?: LocalizedContent;
  name: LocalizedContent;
  board: LocalizedContent;
  count: number;
  adults: number;
  children: number;
  infants: number;
  childAges: number[];
  sellPerNight: string;
  costPerNight: string;
}
export interface QuotationHotel {
  id: string;
  catalogueId?: string;
  meals?: LocalizedContent;
  extras?: LocalizedContent;
  name: LocalizedContent;
  description: LocalizedContent;
  location: LocalizedContent;
  rating: '' | '1' | '2' | '3' | '4' | '5';
  supplierId: string;
  contact: string;
  amenities: LocalizedContent;
  images: string[];
  checkIn: string;
  checkOut: string;
  includedInPackage: boolean;
  rooms: QuotationRoom[];
}
export interface QuotationContent {
  type: QuotationType;
  title: LocalizedContent;
  summary: LocalizedContent;
  location: LocalizedContent;
  destination: LocalizedContent;
  destinationCatalogueId?: string;
  categories: string[];
  categoryCatalogueRefs?: { id: string; name: string }[];
  cruiseType:
    | ''
    | 'standard-nile-cruises'
    | 'deluxe-nile-cruise'
    | 'superior-nile-cruise'
    | 'luxury-nile-cruise';
  departurePort: LocalizedContent;
  duration: LocalizedContent;
  groupSize: LocalizedContent;
  travelStyle: LocalizedContent;
  overview: LocalizedContent;
  highlightImage: string;
  highlights: { id: string; title: LocalizedContent; items: LocalizedContent }[];
  itinerary: {
    id: string;
    day: LocalizedContent;
    title: LocalizedContent;
    description: LocalizedContent;
    meals: LocalizedContent;
    mealId?: string;
    image: string;
  }[];
  itineraryNote: LocalizedContent;
  included: LocalizedContent;
  excluded: LocalizedContent;
  addOns: { id: string; title: LocalizedContent; price: string; catalogueId?: string }[];
  datePrices: {
    id: string;
    title: LocalizedContent;
    startDate: string;
    endDate: string;
    price: string;
    note: LocalizedContent;
    prefix: LocalizedContent;
    tiers: { id: string; label: LocalizedContent; price: string; suffix: LocalizedContent }[];
  }[];
  gallery: {
    id: string;
    mediaId: string;
    alt: LocalizedContent;
    creditLabel: string;
    creditUrl: string;
  }[];
  videos: {
    id: string;
    url: string;
    platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'vimeo' | 'direct';
    title: LocalizedContent;
    publishedOn: string;
    thumbnail: string;
  }[];
  locations: { id: string; name: LocalizedContent; latitude: string; longitude: string }[];
  hotels: QuotationHotel[];
  pricing: {
    currency: string;
    basePrice: string;
    adultRates: PassengerRate[];
    childRates: PassengerRate[];
    infantRates: PassengerRate[];
    adults: number;
    children: number;
    infants: number;
    startDate: string;
    endDate: string;
    selectedAddOns: string[];
    discountPercent: string;
    discountEndsOn: string;
    costsComplete: boolean;
    costItems: { id: string; title: LocalizedContent; supplierId: string; amount: string }[];
  };
  validUntil: string;
  terms: LocalizedContent;
  internalNotes: string;
}
export interface QuotationPrice {
  currency: string;
  originalTravelerTotal: string;
  travelersTotal: string;
  discount: string;
  units: { adult: string; child: string; infant: string };
  addOnTotal: string;
  onRequestAddOns: string[];
  hotelTotal: string;
  additionalHotelTotal: string;
  total: string;
  totalCost: string | null;
  supplierCost: string | null;
}
export interface QuotationSummary {
  id: string;
  reference: string;
  customerId: string | null;
  customerName: string | null;
  title: LocalizedContent;
  type: QuotationType;
  status: QuotationStatus;
  currency: string;
  total: string | null;
  version: number;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
export interface QuotationDocument extends QuotationSummary {
  content: QuotationContent;
  price: QuotationPrice | null;
  branding: { projectName: string; logoUrl: string; primaryColor: string };
  customer: { id: string; fullName: string; email: string | null; phone: string | null } | null;
}
export interface QuotationDirectory {
  quotations: QuotationSummary[];
  total: number;
  page: number;
  pageSize: number;
  metrics: {
    total: number;
    draft: number;
    ready: number;
    sent: number;
    accepted: number;
    booked: number;
    expired: number;
    declined: number;
  };
}
export interface QuotationOptions {
  catalogue: CatalogueSelection;
  customers: { id: string; name: string; email: string | null; phone: string | null }[];
  suppliers: { id: string; name: string }[];
  baseCurrency: string;
  currencies: string[];
}
export const emptyLocalized = (): LocalizedContent => ({ en: '', ar: '' });
export function blankQuotation(currency: string): QuotationContent {
  const text = emptyLocalized;
  return {
    type: 'one-day-tours',
    title: text(),
    summary: text(),
    location: text(),
    destination: text(),
    categories: [],
    cruiseType: '',
    departurePort: text(),
    duration: text(),
    groupSize: text(),
    travelStyle: text(),
    overview: text(),
    highlightImage: '',
    highlights: [],
    itinerary: [],
    itineraryNote: text(),
    included: text(),
    excluded: text(),
    addOns: [],
    datePrices: [],
    gallery: [],
    videos: [],
    locations: [],
    hotels: [],
    pricing: {
      currency,
      basePrice: '',
      adultRates: [],
      childRates: [],
      infantRates: [],
      adults: 1,
      children: 0,
      infants: 0,
      startDate: '',
      endDate: '',
      selectedAddOns: [],
      discountPercent: '0.00',
      discountEndsOn: '',
      costsComplete: false,
      costItems: [],
    },
    validUntil: '',
    terms: text(),
    internalNotes: '',
  };
}
