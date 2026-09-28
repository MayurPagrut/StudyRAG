import { app } from './app';
import { pool } from './config/db';
import { env } from './config/env';
import { documentService } from './services/documentService';

async function main() {
  await pool.query('SELECT 1'); // fail fast when DATABASE_URL is wrong
  await documentService.recoverInterrupted();
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}/api  (RAG_MODE=${env.RAG_MODE})`);
  });
  const shutdown = () => server.close(() => pool.end().finally(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err instanceof Error ? err.message : err);
  process.exit(1);
});
