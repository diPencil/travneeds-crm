import type { QuotationContent, QuotationPrice, PassengerRate } from './quotation.contracts.js';
import { decimalToMinor, minorToDecimal } from '../finance/money.js';

const max = 999999999999999999n;
function money(value: string): bigint {
  if (!/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(value)) throw new Error('Invalid quotation price');
  const amount = decimalToMinor(value);
  if (amount > max) throw new Error('Quotation amount exceeds limit');
  return amount;
}
function rate(rows: PassengerRate[], count: number, fallback: bigint): bigint {
  const ordered = [...rows].sort((a, b) => a.travelers - b.travelers);
  if (
    new Set(rows.map((row) => row.travelers)).size !== rows.length ||
    rows.some((row) => !Number.isInteger(row.travelers) || row.travelers < 1 || row.travelers > 60)
  )
    throw new Error('Invalid passenger tiers');
  const selected =
    ordered.find((row) => row.travelers === count) ??
    [...ordered].reverse().find((row) => row.travelers <= count) ??
    ordered[0];
  return selected ? money(selected.price) : fallback;
}
export function hotelNights(checkIn: string, checkOut: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut))
    throw new Error('Invalid stay dates');
  const nights =
    (Date.parse(checkOut + 'T00:00:00Z') - Date.parse(checkIn + 'T00:00:00Z')) / 86400000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 366)
    throw new Error('Invalid stay duration');
  return nights;
}
export function calculateQuotation(content: QuotationContent, now = new Date()): QuotationPrice {
  const p = content.pricing;
  const counts = [p.adults, p.children, p.infants];
  if (
    counts.some((count) => !Number.isInteger(count) || count < 0) ||
    p.adults < 1 ||
    counts.reduce((sum, count) => sum + count, 0) > 60
  )
    throw new Error('Invalid travelers');
  const headcount = counts.reduce((sum, count) => sum + count, 0);
  const adult = rate(p.adultRates, headcount, money(p.basePrice));
  const original = [
    adult,
    rate(p.childRates, headcount, adult),
    rate(p.infantRates, headcount, 0n),
  ];
  const configuredDiscount = money(p.discountPercent);
  if (configuredDiscount > 10000n) throw new Error('Invalid discount');
  const discount =
    p.discountEndsOn && p.discountEndsOn < now.toISOString().slice(0, 10) ? 0n : configuredDiscount;
  const units = original.map((unit) => (unit * (10000n - discount) + 5000n) / 10000n);
  const originalTotal = original.reduce((sum, unit, i) => sum + unit * BigInt(counts[i]), 0n);
  const travelers = units.reduce((sum, unit, i) => sum + unit * BigInt(counts[i]), 0n);
  if (new Set(p.selectedAddOns).size !== p.selectedAddOns.length)
    throw new Error('Duplicate selected add-on');
  let extras = 0n;
  const onRequest: string[] = [];
  for (const id of p.selectedAddOns) {
    const addon = content.addOns.find((item) => item.id === id);
    if (!addon) throw new Error('Unknown add-on');
    if (addon.price === '') onRequest.push(id);
    else extras += money(addon.price);
  }
  let hotels = 0n;
  let additional = 0n;
  let cost = 0n;
  let supplierCost = 0n;
  let costsKnown = p.costsComplete;
  for (const stay of content.hotels) {
    const nights = hotelNights(stay.checkIn, stay.checkOut);
    let stayPrice = 0n;
    for (const room of stay.rooms) {
      if (
        !Number.isInteger(room.count) ||
        room.count < 1 ||
        room.count > 60 ||
        room.adults < 1 ||
        room.children !== room.childAges.length ||
        room.childAges.some((age) => !Number.isInteger(age) || age < 0 || age > 17)
      )
        throw new Error('Invalid room occupancy');
      const factor = BigInt(room.count * nights);
      stayPrice += money(room.sellPerNight) * factor;
      if (room.costPerNight === '') costsKnown = false;
      else {
        const amount = money(room.costPerNight) * factor;
        cost += amount;
        if (stay.supplierId) supplierCost += amount;
      }
    }
    hotels += stayPrice;
    if (!stay.includedInPackage) additional += stayPrice;
  }
  for (const item of p.costItems) {
    const amount = money(item.amount);
    cost += amount;
    if (item.supplierId) supplierCost += amount;
  }
  const total = travelers + extras + additional;
  if ([total, cost, hotels, supplierCost, originalTotal].some((value) => value > max))
    throw new Error('Quotation amount exceeds limit');
  return {
    currency: p.currency,
    originalTravelerTotal: minorToDecimal(originalTotal),
    travelersTotal: minorToDecimal(travelers),
    discount: minorToDecimal(originalTotal - travelers),
    units: {
      adult: minorToDecimal(units[0]),
      child: minorToDecimal(units[1]),
      infant: minorToDecimal(units[2]),
    },
    addOnTotal: minorToDecimal(extras),
    onRequestAddOns: onRequest,
    hotelTotal: minorToDecimal(hotels),
    additionalHotelTotal: minorToDecimal(additional),
    total: minorToDecimal(total),
    totalCost: costsKnown ? minorToDecimal(cost) : null,
    supplierCost: costsKnown ? minorToDecimal(supplierCost) : null,
  };
}
