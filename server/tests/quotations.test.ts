import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankQuotation } from '../../shared/quotations/quotation.contracts.js';
import { calculateQuotation, hotelNights } from '../../shared/quotations/quotation-pricing.js';

test('quotation pricing uses source traveler tiers and never double counts included hotel rooms', () => {
  const quotation = blankQuotation('USD');
  quotation.pricing.basePrice = '100.00';
  quotation.pricing.adults = 2;
  quotation.pricing.children = 1;
  quotation.pricing.adultRates = [{ travelers: 2, price: '90.00' }];
  quotation.pricing.childRates = [{ travelers: 2, price: '45.00' }];
  quotation.pricing.discountPercent = '10.00';
  quotation.addOns = [{ id: 'extra', title: { en: 'Entered extra', ar: '' }, price: '12.34' }];
  quotation.pricing.selectedAddOns = ['extra'];
  quotation.hotels = [
    {
      id: 'stay',
      name: { en: 'Entered hotel', ar: '' },
      description: { en: '', ar: '' },
      location: { en: '', ar: '' },
      rating: '',
      supplierId: '',
      contact: '',
      amenities: { en: '', ar: '' },
      images: [],
      checkIn: '2026-11-19',
      checkOut: '2026-11-21',
      includedInPackage: true,
      rooms: [
        {
          id: 'room',
          name: { en: 'Entered room', ar: '' },
          board: { en: '', ar: '' },
          count: 1,
          adults: 2,
          children: 1,
          infants: 0,
          childAges: [8],
          sellPerNight: '50.00',
          costPerNight: '30.00',
        },
      ],
    },
  ];
  const included = calculateQuotation(quotation, new Date('2026-11-19T12:00:00Z'));
  assert.equal(included.travelersTotal, '202.50');
  assert.equal(included.total, '214.84');
  assert.equal(included.hotelTotal, '100.00');
  assert.equal(included.totalCost, null);
  quotation.hotels[0].includedInPackage = false;
  assert.equal(calculateQuotation(quotation).total, '314.84');
  assert.equal(hotelNights('2028-02-28', '2028-03-01'), 2);
  assert.throws(() => hotelNights('2026-11-20', '2026-11-19'));
});

test('unpriced add-ons remain on request and invalid commercial values cannot become bookings', () => {
  const quotation = blankQuotation('USD');
  quotation.pricing.basePrice = '1.00';
  quotation.addOns = [{ id: 'request', title: { en: 'Request service', ar: '' }, price: '' }];
  quotation.pricing.selectedAddOns = ['request'];
  const price = calculateQuotation(quotation);
  assert.equal(price.total, '1.00');
  assert.deepEqual(price.onRequestAddOns, ['request']);
  quotation.pricing.basePrice = '';
  assert.throws(() => calculateQuotation(quotation));
  quotation.pricing.basePrice = '1.00';
  quotation.pricing.selectedAddOns = ['not-a-record'];
  assert.throws(() => calculateQuotation(quotation));
});
