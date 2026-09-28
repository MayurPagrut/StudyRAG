/**
 * ============================================================================
 *  RAG INTEGRATION BOUNDARY
 *  The rest of the backend talks to the RAG system ONLY through this interface.
 *  To connect your real Python RAG: set RAG_MODE=real and implement/adjust
 *  PythonRagService.ts. Nothing else in the app needs to change.
 * ============================================================================
 */
import { MessageRecord, RagSource } from '../../types';

export type { RagSource };

export interface RagQueryInput {
  question: string;
  conversationId?: string;
  /** Previous messages in this conversation, oldest first (excludes the current question). */
  history?: Pick<MessageRecord, 'role' | 'content'>[];
}
export interface RagQueryResult {
  answer: string;
  sources: RagSource[];
}

export type RagStreamEvent =
  | { type: 'token'; text: string }
  | { type: 'sources'; sources: RagSource[] };

export interface RagIngestInput {
  /** App document id (app.documents.id, UUID). */
  documentId: string;
  /** Absolute path of the uploaded PDF on the Node server's disk. */
  filePath: string;
  filename: string;
  title?: string;
  subject?: string;
}
export interface RagIngestResult {
  /** The RAG system's own id for this document (e.g. public.documents.id). Stored so sources/deletes can be mapped. */
  ragDocumentId?: string;
  pageCount?: number;
}

export interface RagDeleteRef {
  ragDocumentId?: string;
  filename?: string;
}

export interface RagService {
  query(input: RagQueryInput): Promise<RagQueryResult>;
  streamQuery(input: RagQueryInput, signal?: AbortSignal): AsyncIterable<RagStreamEvent>;
  ingestDocument(input: RagIngestInput): Promise<RagIngestResult>;
  deleteDocument(documentId: string, ref?: RagDeleteRef): Promise<void>;
}
