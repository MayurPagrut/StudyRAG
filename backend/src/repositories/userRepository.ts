import { query } from '../config/db';
import { Role, User, UserWithHash } from '../types';

const COLS = `id, name, email, role, created_at AS "createdAt"`;

export const userRepository = {
  async create(input: { name: string; email: string; passwordHash: string; role?: Role }): Promise<User> {
    const rows = await query<User>(
      `INSERT INTO app.users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
      [input.name, input.email, input.passwordHash, input.role ?? 'user'],
    );
    return rows[0];
  },

  async findByEmailWithHash(email: string): Promise<UserWithHash | null> {
    const rows = await query<UserWithHash>(
      `SELECT ${COLS}, password_hash AS "passwordHash" FROM app.users WHERE email = $1`,
      [email],
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const rows = await query<User>(`SELECT ${COLS} FROM app.users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },
};
