import { z } from 'zod';

export const userDetailsInput = z
  .object({
    fullName: z.string().trim().min(1).max(160),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(30),
    department: z.string().trim().max(120),
    jobTitle: z.string().trim().max(120),
    role: z.enum(['admin', 'employee']),
    avatarGender: z.enum(['male', 'female']),
    status: z.enum(['active', 'disabled']),
    dateOfBirth: z
      .union([
        z.literal(''),
        z.iso.date().refine((date) => date <= new Date().toISOString().slice(0, 10)),
      ])
      .optional(),
    nationality: z.string().trim().max(100).optional(),
    gender: z.enum(['male', 'female', 'unspecified']).optional(),
    address: z.string().trim().max(500).optional(),
    emergencyContactName: z.string().trim().max(160).optional(),
    emergencyContactPhone: z.string().trim().max(30).optional(),
    emergencyRelationship: z.string().trim().max(60).optional(),
  })
  .strict();
export const createUserInput = userDetailsInput.extend({ password: z.string().min(12).max(128) });
export const updateUserInput = userDetailsInput.extend({ version: z.number().int().positive() });
export const inviteInput = userDetailsInput
  .pick({ fullName: true, email: true, role: true, avatarGender: true })
  .strict();
export const acceptInviteInput = z.object({ password: z.string().min(12).max(128) }).strict();
export const uuidInput = z.string().uuid();
export const invitationTokenInput = z.string().regex(/^[a-f0-9]{64}$/);
