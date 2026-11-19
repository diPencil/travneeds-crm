# Customer File verification

`npm run check` passed all 51 tests, including signed-in Chromium verification of the Customers directory File link, populated timeline and empty history section.

The isolated MySQL suite verified lead conversion, quotation versions after reassignment, accepted quotation email, incoming and outgoing chat, cancelled booking history, currency-level verified receipts net of refunds, manual invoice links, pagination and the absence of unrelated records. It verified session requirements, archived-customer restrictions, and employee versus administrator access to payments and social messages. The Meta binding test used a signed local delivery fixture and covered linking, unlinking and stale changes.

Migrations 020 and 021 were applied locally. Development database data was left intact. No live Meta or SMTP delivery was used to verify the file.
