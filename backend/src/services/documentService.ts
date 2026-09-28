import { promises as fs } from 'fs';
import path from 'path';
import { env } from '../config/env';
import { documentRepository } from '../repositories/documentRepository';
import { DocumentRecord } from '../types';
import { AppError } from '../utils/AppError';
import { ragService } from './rag';

const uploadRoot = path.resolve(env.UPLOAD_DIR);
const docDir = (id: string) => path.join(uploadRoot, id);
const notFound = () => new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');

function sanitizeFilename(original: string): string {
  const base = path.basename(original).replace(/[^\w.\-() ]+/g, '_').slice(0, 200);
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}

/** Runs in the background after the upload response has been sent. */
async function runIngest(doc: DocumentRecord, filePath: string): Promise<void> {
  try {
    const result = await ragService.ingestDocument({
      documentId: doc.id, filePath, filename: doc.filename,
      title: doc.title ?? undefined, subject: doc.subject ?? undefined,
    });
    await documentRepository.update(doc.id, {
      status: 'ready', pageCount: result.pageCount ?? null, ragDocumentId: result.ragDocumentId ?? null, errorMessage: null,
    });
  } catch (err) {
    console.error(`[ingest failed] ${doc.id}`, err);
    const message = err instanceof Error ? err.message : 'Unknown processing error';
    await documentRepository.update(doc.id, { status: 'failed', errorMessage: message.slice(0, 500) }).catch(() => undefined);
  }
}

export const documentService = {
  async upload(
    userId: string,
    file: Express.Multer.File | undefined,
    meta: { title?: string; subject?: string; description?: string },
  ): Promise<DocumentRecord> {
    if (!file) throw new AppError(400, 'FILE_REQUIRED', 'Attach a PDF in the "file" field');
    if (!file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new AppError(415, 'INVALID_FILE_TYPE', 'The file is not a valid PDF');
    }

    const filename = sanitizeFilename(file.originalname);
    const doc = await documentRepository.create({
      filename,
      title: meta.title ?? filename.replace(/\.pdf$/i, ''),
      subject: meta.subject ?? null,
      description: meta.description ?? null,
      fileSize: file.size,
      uploadedBy: userId,
    });

    const filePath = path.join(docDir(doc.id), filename);
    try {
      await fs.mkdir(docDir(doc.id), { recursive: true });
      await fs.writeFile(filePath, file.buffer);
    } catch (err) {
      await documentRepository.update(doc.id, { status: 'failed', errorMessage: 'Could not store the uploaded file' });
      throw err;
    }

    const processing = (await documentRepository.update(doc.id, { status: 'processing' })) ?? doc;
    void runIngest(processing, filePath); // intentionally not awaited: the client polls for status
    return processing;
  },

  list: () => documentRepository.list(),

  async get(id: string) {
    const doc = await documentRepository.findById(id);
    if (!doc) throw notFound();
    return doc;
  },

  async remove(id: string): Promise<void> {
    const doc = await this.get(id);
    if (doc.status === 'deleting') throw new AppError(409, 'DOCUMENT_BUSY', 'Document is already being deleted');
    if (doc.status === 'uploading' || doc.status === 'processing') {
      throw new AppError(409, 'DOCUMENT_BUSY', 'Document is still processing. Try again when it finishes.');
    }

    await documentRepository.update(id, { status: 'deleting' });
    try {
      await ragService.deleteDocument(id, { ragDocumentId: doc.ragDocumentId ?? undefined, filename: doc.filename });
    } catch (err) {
      console.error(`[rag.deleteDocument failed] ${id}`, err);
      await documentRepository.update(id, { status: 'failed', errorMessage: 'Could not remove this document from the RAG index. Try deleting again.' });
      throw new AppError(502, 'RAG_UNAVAILABLE', 'Could not remove the document from the RAG index. Try again.');
    }
    await documentRepository.remove(id);
    await fs.rm(docDir(id), { recursive: true, force: true }).catch(() => undefined);
  },

  async recoverInterrupted(): Promise<void> {
    const n = await documentRepository.failInterrupted();
    if (n > 0) console.warn(`Marked ${n} interrupted document(s) as failed`);
  },
};
