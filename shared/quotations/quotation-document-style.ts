export const quotationDocumentStyle = `
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: #f6f8fb; color: #172133; font: 14px/1.75 QuotationFont,Arial,sans-serif; }
a { color: #245ae3; text-decoration: none; overflow-wrap: anywhere; }
img { max-width: 100%; object-fit: cover; }
h1,h2,h3,p { margin: 0; }
h1 { font-size: 36px; line-height: 1.3; font-weight: 700; }
h2 { font-size: 24px; margin-bottom: 18px; line-height: 1.4; }
h3 { font-size: 17px; margin-bottom: 10px; }
p+p { margin-top: 10px; }
.q-wrap { max-width: 1160px; padding: 24px; margin: auto; }
.q-top { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 26px; }
.q-logo { max-width: 220px; max-height: 54px; object-fit: contain; }
.q-meta { text-align: end; color: #687489; font-size: 12px; }
.q-hero { background: white; border: 1px solid #e7ebf0; border-radius: 24px; overflow: hidden; }
.q-gallery { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; height: 320px; }
.q-cover { width: 100%; height: 320px; }
.q-gallery-side { display: grid; grid-template-rows: 1fr 1fr; gap: 8px; overflow: hidden; }
.q-gallery-side img { width: 100%; height: 156px; }
.q-heading { padding: 30px; }
.q-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #285be0; font-weight: 700; margin-bottom: 8px; }
.q-subtitle { color: #687489; margin-top: 12px; }
.q-facts { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 25px; padding-top: 22px; border-top: 1px solid #e7ebf0; }
.q-fact small { display: block; color: #687489; font-size: 11px; }
.q-nav { display: flex; gap: 22px; flex-wrap: wrap; padding: 20px 2px; font-weight: 700; font-size: 12px; }
.q-layout { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 24px; align-items: start; }
.q-main { min-width: 0; }
.q-section,.q-price { background: white; border: 1px solid #e7ebf0; border-radius: 20px; padding: 26px; margin-bottom: 22px; overflow-wrap: anywhere; }
.q-rich ul,.q-rich ol { padding-inline-start: 22px; }
.q-rich table { border-collapse: collapse; width: 100%; }
.q-rich td,.q-rich th { border: 1px solid #dce3ed; padding: 8px; }
.q-rich h2,.q-rich h3 { margin: 16px 0 10px; }
.q-two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.q-list { white-space: pre-wrap; margin: 0; padding-inline-start: 20px; }
.q-list li { margin-block: 8px; }
.q-highlight { padding: 16px; border-radius: 14px; background: #f4f7fc; }
.q-step { border-inline-start: 2px solid #dbe5ff; padding-inline-start: 22px; margin-block: 24px; break-inside: avoid; }
.q-step-image { width: 100%; max-height: 260px; border-radius: 14px; margin-bottom: 15px; }
.q-day { display: inline-block; background: #eef3ff; color: #245ae3; border-radius: 99px; padding: 3px 12px; font-size: 11px; font-weight: 700; margin-bottom: 8px; }
.q-meals { color: #687489; font-size: 12px; margin-top: 12px; }
.q-price { border-top: 4px solid #285be0; }
.q-price-total { font-size: 30px; color: #245ae3; font-weight: 700; margin-bottom: 10px; }
.q-amounts div { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; padding-block: 7px; }
.q-amounts dt { color: #687489; }
.q-amounts dd { margin: 0; font-weight: 700; text-align: end; }
.q-notice { background: #f1f5ff; color: #3b527c; padding: 14px; border-radius: 12px; font-size: 11px; margin-top: 15px; }
.q-hotel { margin-block: 22px; border-top: 1px solid #e7ebf0; padding-top: 20px; }
.q-hotel-photo { width: 100%; max-height: 230px; border-radius: 14px; margin-bottom: 16px; }
.q-table-scroll { overflow-x: auto; }
.q-table { border-collapse: collapse; width: 100%; font-size: 12px; text-align: start; }
.q-table td,.q-table th { padding: 10px 8px; border-bottom: 1px solid #e7ebf0; text-align: start; }
.q-table th { background: #f4f7fc; color: #687489; font-size: 10px; }
.q-period { border: 1px solid #e7ebf0; border-radius: 14px; padding: 17px; margin-bottom: 14px; }
.q-media-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.q-media-grid img { height: 160px; width: 100%; border-radius: 12px; }
.q-caption { font-size: 11px; color: #687489; margin-top: 6px; }
.q-footer { display: flex; justify-content: space-between; gap: 20px; border-top: 1px solid #dce3ed; padding: 18px 0; color: #687489; font-size: 11px; }
.q-multiline { white-space: pre-wrap; }
@media(max-width:760px) {
 .q-wrap { padding: 12px; }.q-gallery { height: 230px; }.q-cover { height: 230px; }.q-gallery-side img { height: 111px; }
 .q-layout { grid-template-columns: 1fr; }.q-heading,.q-section,.q-price { padding: 20px; } h1 { font-size: 28px; }
 .q-facts { grid-template-columns: 1fr 1fr; }.q-two,.q-media-grid { grid-template-columns: 1fr; }.q-logo { max-width: 145px; }
 .q-top { gap: 12px; }.q-table { min-width: 480px; }
}
@page { size:A4; margin:12mm; }
@media print {
 html { scroll-behavior:auto; }body { background:white; font-size:10pt; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
 .q-wrap { max-width:none; padding:0; }.q-nav { display:none; }.q-layout { display:block; }
 .q-hero { border-radius:14px; }.q-gallery { height:220px; }.q-cover { height:220px; }.q-gallery-side img { height:106px; }
 .q-heading { padding:22px; }.q-section { border:0; border-bottom:1px solid #dce3ed; padding:20px 0; border-radius:0; margin:0; }
 .q-price { break-inside:avoid; margin-top:20px; }.q-two { grid-template-columns:1fr 1fr; }h1 { font-size:28px; }h2 { font-size:20px; break-after:avoid; }
 .q-table-scroll { overflow:visible; }.q-table { min-width:0; table-layout:fixed; }.q-table td { overflow-wrap:anywhere; }thead { display:table-header-group; }
 tr,.q-period,.q-highlight,.q-footer { break-inside:avoid; }.q-media-grid { grid-template-columns:1fr 1fr; }.q-footer { margin-top:25px; }
}
`;
