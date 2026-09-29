import 'dotenv/config';
import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_SSL: z.enum(['true', 'false']).optional(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    RAG_MODE: z.enum(['mock', 'real']).default('mock'),
    PYTHON_RAG_URL: z.string().url().optional(),
    RAG_SERVICE_URL: z.string().url().optional(),
    RAG_SERVICE_TOKEN: z.string().min(1).optional(),
    RAG_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
    RAG_INGEST_TIMEOUT_MS: z.coerce.number().int().positive().default(600_000),
    MOCK_RAG_SOURCES: z.enum(['true', 'false']).default('false'),
    CHAT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    CHAT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
    UPLOAD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_UPLOAD_MB: z.coerce.number().positive().default(25),
  })
  .refine((v) => v.RAG_MODE !== 'real' || !!v.PYTHON_RAG_URL || !!v.RAG_SERVICE_URL, {
    message: 'PYTHON_RAG_URL is required when RAG_MODE=real',
    path: ['PYTHON_RAG_URL'],
  })
  .refine((v) => v.NODE_ENV !== 'production' || v.RAG_MODE === 'real', {
    message: 'RAG_MODE=real is required in production',
    path: ['RAG_MODE'],
  })
  .refine((v) => v.NODE_ENV !== 'production' || !!v.PYTHON_RAG_URL || !!v.RAG_SERVICE_URL, {
    message: 'PYTHON_RAG_URL is required in production',
    path: ['PYTHON_RAG_URL'],
  })
  .refine((v) => v.NODE_ENV !== 'production' || !!v.RAG_SERVICE_TOKEN, {
    message: 'RAG_SERVICE_TOKEN is required in production',
    path: ['RAG_SERVICE_TOKEN'],
  })
  .refine((v) => v.NODE_ENV !== 'production' || !v.CORS_ORIGIN.includes('localhost'), {
    message: 'CORS_ORIGIN must use the deployed frontend origin in production',
    path: ['CORS_ORIGIN'],
  });

// Treat "KEY=" (empty) lines in .env as unset so defaults apply.
const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''));
const parsed = schema.safeParse(raw);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
