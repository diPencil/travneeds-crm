import { z } from 'zod';
import {
  customerStatuses,
  customerTypes,
  leadStatuses,
  leadPriorities,
  leadSources,
  supplierStatuses,
} from '../../../../shared/crm/crm.contracts.js';

const optionalText = (length: number) => z.string().trim().max(length);
const common = {
  fullName: z.string().trim().min(1).max(160),
  email: z
    .union([z.literal(''), z.string().trim().email().max(254)])
    .transform((value) => value.toLowerCase()),
  phone: optionalText(30),
  company: optionalText(160),
  notes: optionalText(5000),
};
const assignedUserId = z.union([z.literal(''), z.string().uuid()]);
export const customerInput = z
  .object({
    ...common,
    type: z.enum(customerTypes),
    status: z.enum(customerStatuses),
    nationality: optionalText(100),
    assignedUserId,
  })
  .strict();
export const leadInput = z
  .object({
    ...common,
    type: z.enum(['B2B', 'B2C']),
    source: z.enum(leadSources),
    priority: z.enum(leadPriorities),
    status: z.enum(leadStatuses),
    valueAmount: z.union([z.literal(''), z.string().regex(/^(0|[1-9]\d{0,12})(\.\d{1,2})?$/)]),
    currency: z.union([
      z.literal(''),
      z
        .string()
        .regex(/^[A-Z]{3}$/)
        .refine((code) => Intl.supportedValuesOf('currency').includes(code)),
    ]),
    assignedUserId,
    nextFollowUpAt: z.union([z.literal(''), z.iso.datetime()]),
  })
  .strict()
  .refine((value) => Boolean(value.valueAmount) === Boolean(value.currency), {
    message: 'Amount and currency must be supplied together',
  });
export const supplierInput = z
  .object({
    ...common,
    category: z.string().trim().min(1).max(100),
    contactName: optionalText(160),
    country: optionalText(100),
    city: optionalText(100),
    status: z.enum(supplierStatuses),
  })
  .strict();
export const recordIdInput = z.string().regex(/^[1-9]\d{0,18}$/);
export const recordVersionInput = z.object({ version: z.number().int().positive() }).strict();
export const convertLeadInput = recordVersionInput.extend({ customerId: recordIdInput.optional() });
export const listInput = z
  .object({
    search: z.string().trim().max(160).default(''),
    status: z.string().max(30).default(''),
    type: z.string().max(30).default(''),
    source: z.string().max(30).default(''),
    agent: z.union([z.literal(''), z.string().uuid()]).default(''),
    overdue: z.enum(['true', 'false']).default('false'),
    archived: z.enum(['true', 'false']).default('false'),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();
