import { query } from '../config/db';
import { Conversation } from '../types';

const COLS = `id, user_id AS "userId", title, created_at AS "createdAt", updated_at AS "updatedAt"`;

export const conversationRepository = {
  async create(userId: string, title: string): Promise<Conversation> {
    const rows = await query<Conversation>(
      `INSERT INTO app.conversations (user_id, title) VALUES ($1, $2) RETURNING ${COLS}`, [userId, title]);
    return rows[0];
  },

  listByUser(userId: string): Promise<Conversation[]> {
    return query<Conversation>(`SELECT ${COLS} FROM app.conversations WHERE user_id = $1 ORDER BY updated_at DESC`, [userId]);
  },

  /** Returns null when the conversation does not exist OR belongs to someone else. */
  async findOwned(id: string, userId: string): Promise<Conversation | null> {
    const rows = await query<Conversation>(`SELECT ${COLS} FROM app.conversations WHERE id = $1 AND user_id = $2`, [id, userId]);
    return rows[0] ?? null;
  },

  async remove(id: string, userId: string): Promise<boolean> {
    const rows = await query(`DELETE FROM app.conversations WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
    return rows.length > 0;
  },

  async setTitle(id: string, title: string): Promise<void> {
    await query(`UPDATE app.conversations SET title = $2 WHERE id = $1`, [id, title]);
  },

  async touch(id: string): Promise<void> {
    await query(`UPDATE app.conversations SET updated_at = NOW() WHERE id = $1`, [id]);
  },
};
