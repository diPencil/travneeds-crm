import type { QuotationDocument, LocalizedContent } from './quotation.contracts.js';
import { hotelNights } from './quotation-pricing.js';
import { formatFinanceMoney } from '../finance/money.js';
import { quotationDocumentStyle } from './quotation-document-style.js';

export const escapeQuotationHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );
export function quotationDocumentHtml(
  document: QuotationDocument,
  locale: 'en' | 'ar',
  images: Record<string, string>,
  fontCss = '',
  logo = '',
): string {
  const c = document.content;
  const price = document.price;
  const ar = locale === 'ar';
  const e = escapeQuotationHtml;
  const text = (en: string, arabic: string) => (ar ? arabic : en);
  const value = (content: LocalizedContent) => content[locale] || content[ar ? 'en' : 'ar'];
  const plain = (content: LocalizedContent) => e(value(content));
  const rich = (content: LocalizedContent) => value(content); // Only server-sanitized revision content enters this renderer.
  const money = (amount: string | null) =>
    e(formatFinanceMoney(amount, c.pricing.currency, ar ? 'ar-EG' : 'en-US'));
  const image = (id: string, alt = '', className = '') =>
    images[id] ? `<img src="${e(images[id])}" alt="${e(alt)}" class="${className}">` : '';
  const lines = (content: LocalizedContent) =>
    `<ul class="q-list">${value(content)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<li>${e(line)}</li>`)
      .join('')}</ul>`;
  const section = (id: string, title: string, html: string) =>
    `<section class="q-section" id="${id}"><h2>${title}</h2>${html}</section>`;
  const types = {
    'one-day-tours': text('One Day Tour', 'رحلة يوم واحد'),
    'multi-days-tours': text('Multi-Day Journey', 'رحلة متعددة الأيام'),
    'nile-cruises': text('Nile Cruise', 'نايل كروز'),
    'shore-excursions': text('Shore Excursion', 'رحلة من الميناء'),
  };
  const gallery = c.gallery.filter((item) => images[item.mediaId]);
  const hero = gallery.length
    ? `<div class="q-gallery">${image(gallery[0].mediaId, value(gallery[0].alt), 'q-cover')}<div class="q-gallery-side">${gallery
        .slice(1, 3)
        .map((item) => image(item.mediaId, value(item.alt)))
        .join('')}</div></div>`
    : '';
  const facts = [
    [text('Duration', 'المدة'), plain(c.duration)],
    [text('Group size', 'حجم المجموعة'), plain(c.groupSize)],
    [text('Travel style', 'نمط الرحلة'), plain(c.travelStyle)],
    [text('Destination', 'الوجهة'), plain(c.destination)],
  ];
  const overview = value(c.overview)
    ? section(
        'overview',
        text('Overview', 'نظرة عامة'),
        `<div class="q-rich">${rich(c.overview)}</div>`,
      )
    : '';
  const highlights = c.highlights.length
    ? section(
        'highlights',
        text('Highlights', 'أبرز المعالم'),
        `${image(c.highlightImage, '', 'q-step-image')}<div class="q-two">${c.highlights.map((item) => `<article class="q-highlight"><h3>${plain(item.title)}</h3>${lines(item.items)}</article>`).join('')}</div>`,
      )
    : '';
  const itinerary = c.itinerary.length
    ? section(
        'itinerary',
        text('Your Itinerary', 'برنامج الرحلة'),
        `${c.itinerary.map((item) => `<article class="q-step">${image(item.image, value(item.title), 'q-step-image')}<span class="q-day">${plain(item.day)}</span><h3>${plain(item.title)}</h3><div class="q-rich">${rich(item.description)}</div>${value(item.meals) ? `<p class="q-meals">${text('Meals', 'الوجبات')}: ${plain(item.meals)}</p>` : ''}</article>`).join('')}<div class="q-rich">${rich(c.itineraryNote)}</div>`,
      )
    : '';
  const hotels = c.hotels.length
    ? section(
        'hotels',
        text('Hotels & Rooms', 'الفنادق والغرف'),
        c.hotels
          .map((stay) => {
            let nights: number | null = null;
            try {
              nights =
                stay.checkIn && stay.checkOut ? hotelNights(stay.checkIn, stay.checkOut) : null;
            } catch {
              /* Invalid draft dates remain visible without invented nights. */
            }
            return `<article class="q-hotel">${stay.images.map((id) => image(id, value(stay.name), 'q-hotel-photo')).join('')}<h3>${plain(stay.name)}${stay.rating ? ` · ${'★'.repeat(Number(stay.rating))}` : ''}</h3><p>${plain(stay.location)}</p><div class="q-rich">${rich(stay.description)}</div><p class="q-meals"><bdi>${e(stay.checkIn)} → ${e(stay.checkOut)}</bdi>${nights ? ` · ${nights} ${text('nights', 'ليالٍ')}` : ''}</p><p class="q-meals">${stay.includedInPackage ? text('Included in package price', 'مشمول في سعر الباقة') : text('Charged in addition to package price', 'يُضاف إلى سعر الباقة')}</p><p class="q-multiline">${plain(stay.amenities)}</p>${stay.meals && value(stay.meals) ? `<p class="q-multiline"><strong>${text('Available meals', 'الوجبات المتاحة')}</strong><br>${plain(stay.meals)}</p>` : ''}${stay.extras && value(stay.extras) ? `<p class="q-multiline"><strong>${text('Available hotel add-ons', 'إضافات الفندق المتاحة')}</strong><br>${plain(stay.extras)}</p>` : ''}<div class="q-table-scroll"><table class="q-table"><thead><tr>${[text('Room', 'الغرفة'), text('Meal plan', 'الإقامة والوجبات'), text('Rooms', 'العدد'), text('Occupancy / room', 'الإشغال / غرفة'), text('Per room / night', 'للغرفة / الليلة')].map((label) => `<th>${label}</th>`).join('')}</tr></thead><tbody>${stay.rooms.map((room) => `<tr><td>${plain(room.name)}${room.description && value(room.description) ? `<div class="q-multiline">${plain(room.description)}</div>` : ''}</td><td>${plain(room.board)}</td><td>${room.count}</td><td>${room.adults} ${text('adults', 'بالغين')}, ${room.children} ${text('children', 'أطفال')}, ${room.infants} ${text('infants', 'رضع')}${room.childAges.length ? `<br>${text('Child ages', 'أعمار الأطفال')}: ${room.childAges.join(', ')}` : ''}</td><td><bdi>${money(room.sellPerNight || null)}</bdi></td></tr>`).join('')}</tbody></table></div></article>`;
          })
          .join(''),
      )
    : '';
  const inclusions =
    value(c.included) || value(c.excluded)
      ? section(
          'inclusions',
          text('Inclusions & Exclusions', 'المشمول وغير المشمول'),
          `<div class="q-two"><div><h3>${text('Included', 'يشمل')}</h3>${lines(c.included)}</div><div><h3>${text('Not included', 'لا يشمل')}</h3>${lines(c.excluded)}</div></div>`,
        )
      : '';
  const addons = c.addOns.length
    ? section(
        'addons',
        text('Optional Add-ons', 'الإضافات الاختيارية'),
        c.addOns
          .map(
            (item) =>
              `<div class="q-period"><b>${plain(item.title)}</b><p><bdi>${item.price ? money(item.price) : text('On request — not charged', 'حسب الطلب — غير محتسب')}</bdi>${c.pricing.selectedAddOns.includes(item.id) ? ` · ${text('Selected', 'محدد')}` : ''}</p></div>`,
          )
          .join(''),
      )
    : '';
  const periods = c.datePrices.length
    ? section(
        'dates',
        text('Travel-Date Price Guide', 'دليل أسعار فترات السفر'),
        `<p class="q-caption">${text('Informational date prices are separate from your confirmed quotation pricing.', 'أسعار الفترات معلومات منفصلة عن التسعير المحدد لهذا الكوتيشن.')}</p>${c.datePrices.map((period) => `<article class="q-period"><h3>${plain(period.title)}</h3><p><bdi>${e(period.startDate)} → ${e(period.endDate)}</bdi></p><p>${plain(period.prefix)} <bdi>${money(period.price || null)}</bdi></p>${period.tiers.map((tier) => `<p>${plain(tier.label)}: <bdi>${money(tier.price || null)}</bdi> ${plain(tier.suffix)}</p>`).join('')}<p>${plain(period.note)}</p></article>`).join('')}`,
      )
    : '';
  const media =
    gallery.length > 3 || c.videos.length
      ? section(
          'media',
          text('Journey Gallery', 'صور وفيديوهات الرحلة'),
          `<div class="q-media-grid">${gallery
            .slice(3)
            .map(
              (item) =>
                `<figure>${image(item.mediaId, value(item.alt))}<figcaption class="q-caption">${plain(item.alt)}${item.creditLabel ? ` · ${item.creditUrl ? `<a target="_blank" rel="noopener noreferrer" href="${e(item.creditUrl)}">${e(item.creditLabel)}</a>` : e(item.creditLabel)}` : ''}</figcaption></figure>`,
            )
            .join(
              '',
            )}${c.videos.map((item) => `<article>${image(item.thumbnail, value(item.title))}<h3>${plain(item.title)}</h3><p class="q-caption">${e(item.platform)} · <bdi>${e(item.publishedOn)}</bdi></p><a target="_blank" rel="noopener noreferrer" href="${e(item.url)}">${text('Watch video', 'مشاهدة الفيديو')}</a></article>`).join('')}</div>`,
        )
      : '';
  const locations = c.locations.length
    ? section(
        'locations',
        text('Places on Your Journey', 'مواقع الرحلة'),
        c.locations
          .map(
            (item) =>
              `<article class="q-period"><h3>${plain(item.name)}</h3>${item.latitude && item.longitude ? `<p><bdi>${e(item.latitude)}, ${e(item.longitude)}</bdi></p><a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat=${e(item.latitude)}&amp;mlon=${e(item.longitude)}#map=12/${e(item.latitude)}/${e(item.longitude)}">${text('Open map', 'فتح الخريطة')}</a>` : ''}</article>`,
          )
          .join(''),
      )
    : '';
  const terms = value(c.terms)
    ? section(
        'terms',
        text('Terms & Conditions', 'الشروط والأحكام'),
        `<p class="q-multiline">${plain(c.terms)}</p>`,
      )
    : '';
  const summaryRows = [
    [text('Travelers', 'المسافرون'), price?.travelersTotal ?? null],
    [text('Selected extras', 'الإضافات المحددة'), price?.addOnTotal ?? null],
    [text('Additional hotel stays', 'الإقامات الإضافية'), price?.additionalHotelTotal ?? null],
  ];
  const pricing = `<aside class="q-price"><p class="q-eyebrow">${text('Your Quotation', 'عرض السعر الخاص بك')}</p><div class="q-price-total"><bdi>${money(price?.total ?? null)}</bdi></div><p>${c.pricing.adults} ${text('adults', 'بالغين')} · ${c.pricing.children} ${text('children', 'أطفال')} · ${c.pricing.infants} ${text('infants', 'رضع')}</p><dl class="q-amounts">${summaryRows.map(([label, amount]) => `<div><dt>${label}</dt><dd><bdi>${money(amount)}</bdi></dd></div>`).join('')}</dl>${price?.onRequestAddOns.length ? `<p class="q-notice">${text('On-request services are not included in this total.', 'الخدمات حسب الطلب غير محتسبة في هذا الإجمالي.')}</p>` : ''}<p class="q-notice">${text('Valid until', 'صالح حتى')}: <bdi>${e(c.validUntil) || '—'}</bdi><br>${text('All prices are in', 'جميع الأسعار بعملة')} <bdi>${e(c.pricing.currency)}</bdi></p></aside>`;
  return `<!doctype html><html lang="${locale}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${e(document.reference)} — ${plain(c.title)}</title><style>${fontCss}${quotationDocumentStyle}</style></head><body><div class="q-wrap"><header class="q-top"><div>${logo ? `<img class="q-logo" src="${e(logo)}" alt="${e(document.branding.projectName)}">` : `<strong>${e(document.branding.projectName)}</strong>`}</div><div class="q-meta"><bdi>${e(document.reference)}</bdi> · ${text('Version', 'إصدار')} ${document.version}<br>${text('Prepared for', 'أُعدّ لصالح')}: ${e(document.customer?.fullName ?? '—')}</div></header><section class="q-hero">${hero}<div class="q-heading"><p class="q-eyebrow">${types[c.type]}</p><h1>${plain(c.title)}</h1><p class="q-subtitle">${plain(c.location)}</p><p class="q-subtitle">${plain(c.summary)}</p>${c.type === 'nile-cruises' ? `<p class="q-subtitle">${e(c.cruiseType)}</p>` : ''}${c.type === 'shore-excursions' ? `<p class="q-subtitle">${text('Departure port', 'ميناء الانطلاق')}: ${plain(c.departurePort)}</p>` : ''}<div class="q-facts">${facts
    .filter(([, value]) => value)
    .map(([label, value]) => `<div class="q-fact"><small>${label}</small><b>${value}</b></div>`)
    .join('')}</div></div></section><nav class="q-nav">${[
    ['overview', text('Overview', 'نظرة عامة')],
    ['itinerary', text('Itinerary', 'البرنامج')],
    ['hotels', text('Hotels', 'الفنادق')],
    ['inclusions', text('Inclusions', 'المشمول')],
    ['locations', text('Locations', 'المواقع')],
  ]
    .map(([id, label]) => `<a href="#${id}">${label}</a>`)
    .join(
      '',
    )}</nav><div class="q-layout"><main class="q-main">${overview}${highlights}${itinerary}${hotels}${inclusions}${addons}${periods}${media}${locations}${terms}</main>${pricing}</div><footer class="q-footer"><span>${e(document.branding.projectName)}</span><span><bdi>${e(document.reference)}</bdi> · ${text('Quotation', 'كوتيشن')}</span></footer></div></body></html>`;
}
