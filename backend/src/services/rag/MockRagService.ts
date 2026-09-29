import { promises as fs } from 'fs';
import { env } from '../../config/env';
import { documentRepository } from '../../repositories/documentRepository';
import { RagDeleteRef, RagIngestInput, RagIngestResult, RagQueryInput, RagQueryResult, RagService, SourceMode } from './RagService';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Development stand-in. It performs NO retrieval, embedding or LLM calls.
 * Every answer is explicitly labelled so it cannot be mistaken for real output.
 */
export class MockRagService implements RagService {
  async waitForRagReady(): Promise<void> {}

  async query(input: RagQueryInput): Promise<RagQueryResult> {
    await sleep(600);
    const answer =
      '[MOCK RAG RESPONSE] This response will later come from my Python RAG service.\n\n' +
      `You asked: "${input.question}"`;

    // Optional: one clearly-fake source so the source-card UI can be exercised.
    if (env.MOCK_RAG_SOURCES === 'true') {
      const doc = await documentRepository.findLatestReady();
      if (doc) {
        return {
          answer,
          sources: [{ documentId: doc.id, documentName: doc.filename, page: 1, chunkId: 'mock-chunk', similarity: 0.5 }],
          sourceMode: 'rag',
        };
      }
    }
    return { answer, sources: [], sourceMode: 'llm' };
  }

  async *streamQuery(input: RagQueryInput, signal?: AbortSignal) {
    const result = await this.query(input);
    yield { type: 'source_mode' as const, source_mode: result.sourceMode as SourceMode };
    for (const text of result.answer.match(/.{1,24}/g) ?? []) {
      if (signal?.aborted) throw new Error('Streaming request cancelled');
      await sleep(30);
      yield { type: 'token' as const, text };
    }
    yield { type: 'sources' as const, sources: result.sources };
  }

  /** Simulates ~3s of processing. A filename containing "fail" simulates an ingestion failure. */
  async ingestDocument(input: RagIngestInput): Promise<RagIngestResult> {
    await sleep(3000);
    if (/fail/i.test(input.filename)) throw new Error('[MOCK] Simulated ingestion failure (filename contains "fail").');
    const buf = await fs.readFile(input.filePath);
    // Rough page estimate for the mock only. The real RAG reports the true page count.
    const pages = (buf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
    return { ragDocumentId: `mock-${input.documentId}`, pageCount: pages || undefined };
  }

  async deleteDocument(_documentId: string, _ref?: RagDeleteRef): Promise<void> {
    await sleep(200);
  }
}
