import { z } from 'zod';
import { paymentStatuses } from '../../../../shared/finance/finance.contracts.js';
const optionalDate = z.union([z.literal(''), z.iso.date()]).default('');
const common = {
  search: z.string().trim().max(160).default(''),
  currency: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(/^[A-Z]{3}$/)
        .refine((value) => Intl.supportedValuesOf('currency').includes(value)),
    ])
    .default(''),
  agent: z.union([z.literal(''), z.string().uuid()]).default(''),
  supplier: z.union([z.literal(''), z.string().regex(/^[1-9]\d{0,18}$/)]).default(''),
  status: z.union([z.literal(''), z.enum(paymentStatuses)]).default(''),
  from: optionalDate,
  to: optionalDate,
  page: z.coerce.number().int().min(1).max(100000).default(1),
};
const validRange = (value: { from: string; to: string }) =>
  !value.from || !value.to || value.from <= value.to;
export const financeQuery = z
  .object(common)
  .strict()
  .refine(validRange, { message: 'Invalid date range' });
export const financeInvoiceQuery = z
  .object({
    ...common,
    party: z.enum(['', 'customer', 'supplier']).default(''),
    invoiceStatus: z.enum(['', 'draft', 'issued', 'void']).default(''),
  })
  .strict()
  .refine(validRange, { message: 'Invalid date range' });
export const financeId = z.string().regex(/^[1-9]\d{0,18}$/);
export type FinanceQuery = z.infer<typeof financeQuery>;
export type FinanceInvoiceQuery = z.infer<typeof financeInvoiceQuery>;
