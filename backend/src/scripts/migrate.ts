import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '../config/db';

async function main() {
  const dir = path.resolve(__dirname, '../../migrations');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    process.stdout.write(`Applying ${file} ... `);
    await pool.query(await fs.readFile(path.join(dir, file), 'utf8'));
    console.log('done');
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
