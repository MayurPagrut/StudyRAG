/** Usage: npm run create-admin -- "Full Name" admin@example.com 'a-strong-password'
 *  Creates an admin, or promotes the account if the email already exists. */
import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db';
import { registerSchema } from '../utils/schemas';

async function main() {
  const [name, email, password] = process.argv.slice(2);
  const parsed = registerSchema.safeParse({ name, email, password });
  if (!parsed.success) {
    console.error('Usage: npm run create-admin -- "Full Name" admin@example.com \'password (8+ chars)\'');
    console.error(parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  const hash = await bcrypt.hash(parsed.data.password, 12);
  const rows = await query<{ id: string }>(
    `INSERT INTO app.users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
     RETURNING id`,
    [parsed.data.name, parsed.data.email, hash],
  );
  console.log(`Admin ready: ${parsed.data.email} (${rows[0].id})`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
