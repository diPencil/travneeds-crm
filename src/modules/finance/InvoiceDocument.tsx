import type { InvoiceDocument as Document } from '../../../shared/finance/invoice.contracts';
import { formatFinanceMoney } from '../../../shared/finance/money';
import { useInvoiceCopy } from './invoice.copy';
import './finance.print.css';
export function InvoiceDocument({
  invoice,
  preview = false,
}: {
  invoice: Document;
  preview?: boolean;
}) {
  const { copy, intlLocale, isRTL } = useInvoiceCopy();
  const money = (value: string | null) => formatFinanceMoney(value, invoice.currency, intlLocale);
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(intlLocale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(value + 'T00:00:00Z'))
      : '—';
  return (
    <article
      className="finance-invoice-document"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={copy.details}
    >
      <header className="invoice-masthead">
        <div className="invoice-brand">
          {invoice.issuerLogo && <img src={invoice.issuerLogo} alt={invoice.issuerName || ''} />}
          <h2>{invoice.issuerName}</h2>
          {invoice.issuerAddress && <p className="invoice-multiline">{invoice.issuerAddress}</p>}
          {invoice.issuerContact && <p className="invoice-multiline">{invoice.issuerContact}</p>}
        </div>
        <div className="invoice-identity">
          <span className="invoice-eyebrow">
            {preview ? copy.previewOnly : invoice.status === 'draft' ? copy.draft : copy.details}
          </span>
          <h1>{copy.invoice}</h1>
          <p className="invoice-number">
            <bdi>{invoice.number || copy.draft}</bdi>
          </p>
        </div>
      </header>
      <section className="invoice-parties">
        <div>
          <h3>{copy.customer}</h3>
          <h2>{invoice.billTo || '—'}</h2>
          {invoice.customerAddress && (
            <p className="invoice-multiline">{invoice.customerAddress}</p>
          )}
          {invoice.customerEmail && (
            <p>
              <bdi>{invoice.customerEmail}</bdi>
            </p>
          )}
          {invoice.customerPhone && (
            <p>
              <bdi>{invoice.customerPhone}</bdi>
            </p>
          )}
        </div>
        <dl className="invoice-metadata">
          <div>
            <dt>{copy.date}</dt>
            <dd>{date(invoice.documentDate || invoice.issuedOn)}</dd>
          </div>
          <div>
            <dt>{copy.due}</dt>
            <dd>{date(invoice.dueOn)}</dd>
          </div>
          {invoice.bookingReference && (
            <div>
              <dt>{copy.booking}</dt>
              <dd>
                <bdi>{invoice.bookingReference}</bdi>
              </dd>
            </div>
          )}
          {invoice.reference && (
            <div>
              <dt>{copy.reference}</dt>
              <dd>
                <bdi>{invoice.reference}</bdi>
              </dd>
            </div>
          )}
          <div>
            <dt>{copy.currency}</dt>
            <dd>
              <bdi>{invoice.currency}</bdi>
            </dd>
          </div>
        </dl>
      </section>
      <div className="invoice-table-scroll">
        <table className="invoice-lines">
          <thead>
            <tr>
              <th className="invoice-position">#</th>
              <th>{copy.description}</th>
              <th className="invoice-numeric">{copy.quantity}</th>
              <th className="invoice-numeric">{copy.unitPrice}</th>
              <th className="invoice-numeric">{copy.amount}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index}>
                <td className="invoice-position">{index + 1}</td>
                <td className="invoice-multiline">{item.description || '—'}</td>
                <td className="invoice-numeric">
                  <bdi>{item.quantity}</bdi>
                </td>
                <td className="invoice-numeric">
                  <bdi>{money(item.unitPrice)}</bdi>
                </td>
                <td className="invoice-numeric">
                  <bdi>{money(item.amount)}</bdi>
                </td>
              </tr>
            ))}
            {!invoice.items.length && (
              <tr>
                <td colSpan={4}>
                  {copy.legacy}
                  {invoice.bookingReference ? ` · ${invoice.bookingReference}` : ''}
                </td>
                <td className="invoice-numeric">
                  <bdi>{money(invoice.amount)}</bdi>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <section className="invoice-bottom">
        <div className="invoice-payment-terms">
          {invoice.terms && (
            <>
              <h3>{copy.terms}</h3>
              <p className="invoice-multiline">{invoice.terms}</p>
            </>
          )}
          {invoice.notes && (
            <>
              <h3>{copy.notes}</h3>
              <p className="invoice-multiline">{invoice.notes}</p>
            </>
          )}
        </div>
        <dl className="invoice-totals">
          {invoice.subtotal !== null && (
            <div>
              <dt>{copy.subtotal}</dt>
              <dd>
                <bdi>{money(invoice.subtotal)}</bdi>
              </dd>
            </div>
          )}
          {invoice.discount !== '0.00' && (
            <div>
              <dt>{copy.discount}</dt>
              <dd>
                <bdi>− {money(invoice.discount)}</bdi>
              </dd>
            </div>
          )}
          {invoice.taxAmount !== null && invoice.taxAmount !== '0.00' && (
            <div>
              <dt>
                {invoice.taxLabel || copy.tax} <bdi>({invoice.taxRate}%)</bdi>
              </dt>
              <dd>
                <bdi>{money(invoice.taxAmount)}</bdi>
              </dd>
            </div>
          )}
          <div className="invoice-grand-total">
            <dt>{copy.total}</dt>
            <dd>
              <bdi>{money(invoice.amount)}</bdi>
            </dd>
          </div>
        </dl>
      </section>
      <footer className="invoice-footer">
        <span>{invoice.issuerName}</span>
        <span>
          {copy.pageNote} <bdi>{invoice.currency}</bdi>
        </span>
      </footer>
    </article>
  );
}
