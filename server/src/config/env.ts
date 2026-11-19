import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PDF_CHROMIUM_PATH: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_ORIGIN: z.string().url().default('http://127.0.0.1:5173'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z
    .string()
    .regex(/^[a-zA-Z0-9_]+$/)
    .default('travneeds_crm'),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_MIGRATION_USER: z.string().default('root'),
  DB_MIGRATION_PASSWORD: z.string().default(''),
  INTEGRATION_SECRET_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string()
      .regex(/^[a-f0-9]{64}$/i)
      .optional(),
  ),
});

export const env = schema.parse(process.env);

if (env.NODE_ENV === 'production' && !env.APP_ORIGIN.startsWith('https://')) {
  throw new Error('Production requires an HTTPS APP_ORIGIN.');
}

if (env.DB_USER === 'root') {
  throw new Error('The application must use its dedicated database account.');
}
