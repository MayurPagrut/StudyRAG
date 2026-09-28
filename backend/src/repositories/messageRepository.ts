import { query } from '../config/db';
import { MessageRecord, MessageRole, RagSource } from '../types';

const COLS = `id, conversation_id AS "conversationId", role, content, sources, created_at AS "createdAt"`;

export const messageRepository = {
  async create(input: { conversationId: string; role: MessageRole; content: string; sources?: RagSource[] }): Promise<MessageRecord> {
    const rows = await query<MessageRecord>(
      `INSERT INTO app.messages (conversation_id, role, content, sources) VALUES ($1, $2, $3, $4::jsonb) RETURNING ${COLS}`,
      [input.conversationId, input.role, input.content, JSON.stringify(input.sources ?? [])],
    );
    return rows[0];
  },

  listByConversation(conversationId: string): Promise<MessageRecord[]> {
    return query<MessageRecord>(`SELECT ${COLS} FROM app.messages WHERE conversation_id = $1 ORDER BY created_at ASC, id ASC`, [conversationId]);
  },

  /** Most recent N messages, returned oldest-first. */
  async recent(conversationId: string, limit: number): Promise<MessageRecord[]> {
    const rows = await query<MessageRecord>(
      `SELECT * FROM (SELECT ${COLS} FROM app.messages WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2) t ORDER BY "createdAt" ASC`,
      [conversationId, limit],
    );
    return rows;
  },

  async remove(id: string): Promise<void> {
    await query(`DELETE FROM app.messages WHERE id = $1`, [id]);
  },
};
