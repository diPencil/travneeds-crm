import { z } from 'zod';
import { calculateInvoice } from '../../../../shared/finance/invoice-calculation.js';

const text = (max: number) => z.string().trim().max(max);
const input = {
  bookingId: z.union([z.literal(''), z.string().regex(/^[1-9]\d{0,18}$/)]),
  customerId: z
    .string()
    .regex(/^[1-9]\d{0,18}$/)
    .optional(),
  billTo: text(160).min(1),
  customerEmail: z.union([z.literal(''), z.email().max(254)]),
  customerPhone: text(40),
  customerAddress: text(1000),
  issuerAddress: text(1000),
  issuerContact: text(500),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .refine((code) => Intl.supportedValuesOf('currency').includes(code)),
  documentDate: z.iso.date(),
  dueOn: z.union([z.literal(''), z.iso.date()]),
  reference: text(120),
  discount: text(20),
  taxRate: text(6),
  taxLabel: text(60),
  terms: text(2000),
  notes: text(4000),
  items: z
    .array(
      z
        .object({ description: text(1000).min(1), quantity: text(12), unitPrice: text(14) })
        .strict(),
    )
    .min(1)
    .max(100),
};
const valid = (value: z.infer<z.ZodObject<typeof input>>) => {
  try {
    calculateInvoice(value.items, value.discount, value.taxRate);
    return (
      (!value.dueOn || value.dueOn >= value.documentDate) &&
      (Number(value.taxRate) === 0 || value.taxLabel.length > 0)
    );
  } catch {
    return false;
  }
};
export const createInvoiceInput = z
  .object({ ...input, requestKey: z.uuid() })
  .strict()
  .refine(valid, { message: 'Invalid invoice totals or dates' });
export const updateInvoiceInput = z
  .object({ ...input, version: z.number().int().positive() })
  .strict()
  .refine(valid, { message: 'Invalid invoice totals or dates' });
export const issueInvoiceInput = z.object({ version: z.number().int().positive() }).strict();
