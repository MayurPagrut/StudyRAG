import { Pool, QueryResultRow } from 'pg';
import { env } from './env';

const isLocal = /localhost|127\.0\.0\.1/.test(env.DATABASE_URL);
const useSsl = env.DATABASE_SSL ? env.DATABASE_SSL === 'true' : !isLocal;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
