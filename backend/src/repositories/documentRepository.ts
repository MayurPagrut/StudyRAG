import { query } from '../config/db';
import { DocumentRecord, DocumentStatus } from '../types';

const COLS = `id, filename, title, subject, description, status,
  file_size::float8 AS "fileSize", page_count AS "pageCount", uploaded_by AS "uploadedBy",
  rag_document_id AS "ragDocumentId", error_message AS "errorMessage",
  created_at AS "uploadedAt", updated_at AS "updatedAt"`;

export interface DocumentPatch {
  status?: DocumentStatus;
  pageCount?: number | null;
  ragDocumentId?: string | null;
  errorMessage?: string | null;
}
const PATCH_COLUMNS: Record<keyof DocumentPatch, string> = {
  status: 'status',
  pageCount: 'page_count',
  ragDocumentId: 'rag_document_id',
  errorMessage: 'error_message',
};

export const documentRepository = {
  async create(input: {
    filename: string; title: string | null; subject: string | null; description: string | null;
    fileSize: number; uploadedBy: string;
  }): Promise<DocumentRecord> {
    const rows = await query<DocumentRecord>(
      `INSERT INTO app.documents (filename, title, subject, description, status, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, 'uploading', $5, $6) RETURNING ${COLS}`,
      [input.filename, input.title, input.subject, input.description, input.fileSize, input.uploadedBy],
    );
    return rows[0];
  },

  list(): Promise<DocumentRecord[]> {
    return query<DocumentRecord>(`SELECT ${COLS} FROM app.documents ORDER BY created_at DESC`);
  },

  async findById(id: string): Promise<DocumentRecord | null> {
    const rows = await query<DocumentRecord>(`SELECT ${COLS} FROM app.documents WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async findByRagDocumentId(ragId: string): Promise<DocumentRecord | null> {
    const rows = await query<DocumentRecord>(`SELECT ${COLS} FROM app.documents WHERE rag_document_id = $1 LIMIT 1`, [ragId]);
    return rows[0] ?? null;
  },

  async findLatestReady(): Promise<DocumentRecord | null> {
    const rows = await query<DocumentRecord>(`SELECT ${COLS} FROM app.documents WHERE status = 'ready' ORDER BY created_at DESC LIMIT 1`);
    return rows[0] ?? null;
  },

  async update(id: string, patch: DocumentPatch): Promise<DocumentRecord | null> {
    const keys = (Object.keys(patch) as (keyof DocumentPatch)[]).filter((k) => patch[k] !== undefined);
    if (keys.length === 0) return this.findById(id);
    const sets = keys.map((k, i) => `${PATCH_COLUMNS[k]} = $${i + 2}`).join(', ');
    const rows = await query<DocumentRecord>(
      `UPDATE app.documents SET ${sets} WHERE id = $1 RETURNING ${COLS}`,
      [id, ...keys.map((k) => patch[k])],
    );
    return rows[0] ?? null;
  },

  async remove(id: string): Promise<void> {
    await query(`DELETE FROM app.documents WHERE id = $1`, [id]);
  },

  /** Startup recovery: ingestion runs in-process, so a restart orphans in-flight documents. */
  async failInterrupted(): Promise<number> {
    const rows = await query(
      `UPDATE app.documents SET status = 'failed', error_message = 'Processing was interrupted by a server restart. Delete and upload again.'
       WHERE status IN ('uploading', 'processing') RETURNING id`,
    );
    return rows.length;
  },
};
