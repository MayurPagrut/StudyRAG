import { promises as fs } from 'fs';
import { env } from '../../config/env';
import { documentRepository } from '../../repositories/documentRepository';
import { RagDeleteRef, RagIngestInput, RagIngestResult, RagQueryInput, RagQueryResult, RagService, RagSource, RagStreamEvent, SourceMode } from './RagService';

/**
 * HTTP adapter for the existing Python RAG (RAG_MODE=real).
 *
 * The Python side needs a thin wrapper (e.g. FastAPI) exposing the 3 endpoints below;
 * the exact JSON is documented in API.md ("RAG service contract"). If your wrapper's
 * field names differ, adjust ONLY the mapping in this file.
 *
 *   POST   {RAG_SERVICE_URL}/query               { question, history[] }            -> { answer, sources[] }
 *   POST   {RAG_SERVICE_URL}/documents           multipart/form-data (file) -> { document_id, pages }
 *   DELETE {RAG_SERVICE_URL}/documents/{ragId}   -> 204
 */
interface PyQueryResponse {
  answer: string;
  sourceMode?: SourceMode;
  sources?: { document_id?: number | string; filename: string; page_number: number; chunk_id?: number | string; similarity?: number }[];
}
interface PyIngestResponse {
  document_id?: number | string;
  pages?: number;
}
interface PyStreamEvent {
  type: 'token' | 'sources' | 'source_mode' | 'error' | 'done';
  source_mode?: SourceMode;
  text?: string;
  message?: string;
  sources?: { document_id?: number | string; filename: string; page_number: number; chunk_id?: number | string; similarity?: number }[];
}

export class PythonRagService implements RagService {
  private readonly base = (env.PYTHON_RAG_URL ?? env.RAG_SERVICE_URL ?? '').replace(/\/$/, '');

  private headers(contentType?: string): HeadersInit {
    return {
      ...(contentType ? { 'Content-Type': contentType } : {}),
      ...(env.RAG_SERVICE_TOKEN ? { Authorization: `Bearer ${env.RAG_SERVICE_TOKEN}` } : {}),
    };
  }

  private async call<T>(method: string, path: string, body: unknown, timeoutMs: number): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: this.headers(body ? 'application/json' : undefined),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`RAG service ${method} ${path} failed with ${res.status}: ${detail.slice(0, 300)}`);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  private async callMultipart<T>(path: string, form: FormData, timeoutMs: number): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`RAG service POST ${path} failed with ${res.status}: ${detail.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  async query(input: RagQueryInput): Promise<RagQueryResult> {
    const data = await this.call<PyQueryResponse>('POST', '/query', { question: input.question, history: input.history ?? [] }, env.RAG_TIMEOUT_MS);

    const sources: RagSource[] = [];
    for (const s of data.sources ?? []) {
      // Map the RAG's integer document id back to the app document (UUID) when we can.
      const appDoc = s.document_id !== undefined ? await documentRepository.findByRagDocumentId(String(s.document_id)) : null;
      sources.push({
        documentId: appDoc?.id ?? String(s.document_id ?? ''),
        documentName: s.filename,
        page: s.page_number,
        chunkId: s.chunk_id !== undefined ? String(s.chunk_id) : undefined,
        similarity: s.similarity,
      });
    }
    return { answer: data.answer, sources, sourceMode: data.sourceMode ?? 'rag' };
  }

  async *streamQuery(input: RagQueryInput, signal?: AbortSignal): AsyncIterable<RagStreamEvent> {
    const timeoutSignal = AbortSignal.timeout(env.RAG_TIMEOUT_MS);
    const requestSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;
    const res = await fetch(`${this.base}/query/stream`, {
      method: 'POST',
      headers: this.headers('application/json'),
      body: JSON.stringify({ question: input.question, history: input.history ?? [] }),
      signal: requestSignal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`RAG service POST /query/stream failed with ${res.status}: ${detail.slice(0, 300)}`);
    }
    if (!res.body) throw new Error('RAG service returned an empty streaming body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;
    while (!finished) {
      const part = await reader.read();
      buffer += decoder.decode(part.value, { stream: !part.done });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as PyStreamEvent;
        if (event.type === 'error') throw new Error(event.message ?? 'RAG streaming failed');
        if (event.type === 'source_mode' && event.source_mode) yield { type: 'source_mode', source_mode: event.source_mode };
        if (event.type === 'token' && event.text) yield { type: 'token', text: event.text };
        if (event.type === 'sources') {
          const sources: RagSource[] = [];
          for (const source of event.sources ?? []) {
            const appDoc = source.document_id !== undefined
              ? await documentRepository.findByRagDocumentId(String(source.document_id))
              : null;
            sources.push({
              documentId: appDoc?.id ?? String(source.document_id ?? ''),
              documentName: source.filename,
              page: source.page_number,
              chunkId: source.chunk_id !== undefined ? String(source.chunk_id) : undefined,
              similarity: source.similarity,
            });
          }
          yield { type: 'sources', sources };
        }
      }
      finished = part.done;
    }
    if (buffer.trim()) {
      const event = JSON.parse(buffer) as PyStreamEvent;
      if (event.type === 'error') throw new Error(event.message ?? 'RAG streaming failed');
    }
  }

  async ingestDocument(input: RagIngestInput): Promise<RagIngestResult> {
    const file = await fs.readFile(input.filePath);
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(file)], { type: 'application/pdf' }), input.filename);
    const data = await this.callMultipart<PyIngestResponse>('/documents', form, env.RAG_INGEST_TIMEOUT_MS);
    return {
      ragDocumentId: data.document_id !== undefined ? String(data.document_id) : undefined,
      pageCount: data.pages,
    };
  }

  async deleteDocument(_documentId: string, ref?: RagDeleteRef): Promise<void> {
    if (!ref?.ragDocumentId) return; // never ingested into the RAG: nothing to remove
    await this.call<void>('DELETE', `/documents/${encodeURIComponent(ref.ragDocumentId)}`, undefined, env.RAG_TIMEOUT_MS);
  }
}
