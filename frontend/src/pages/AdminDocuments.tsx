import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DocumentTable } from '../components/DocumentTable';
import { Spinner } from '../components/Spinner';
import { UploadDropzone } from '../components/UploadDropzone';
import { useDocuments } from '../hooks/useDocuments';
import { errorMessage } from '../services/api';
import { documentApi } from '../services/documentApi';
import { DocumentItem, UploadMeta } from '../types';

export default function AdminDocuments() {
  const { documents, loading, error, reload } = useDocuments();
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  async function upload(file: File, meta: UploadMeta) {
    await documentApi.upload(file, meta);
    await reload();
    setUploadMessage(`"${file.name}" was uploaded and is now being processed.`);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true); setDeleteError(null);
    try { await documentApi.delete(toDelete.id); setToDelete(null); await reload(); }
    catch (e) { setDeleteError(errorMessage(e)); void reload(); }
    finally { setDeleting(false); }
  }

  return (
    <>
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-moss-dark">Knowledge base</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">Document Management</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Upload and manage the PDF documents used as knowledge sources for the RAG system.
        </p>
      </header>
      <div className="mt-6"><UploadDropzone onUpload={upload} /></div>
      {uploadMessage && (
        <p role="status" className="mt-3 rounded bg-sage px-4 py-3 text-sm text-moss-dark" aria-live="polite">
          {uploadMessage}
        </p>
      )}

      <div className="mb-3 mt-10 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-semibold">All documents</h2>
          <p className="mt-1 text-sm text-muted">Track processing status, metadata, and indexed files.</p>
        </div>
        {!loading && !error && <span className="text-sm text-muted">{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>}
      </div>
      {loading && <Spinner label="Loading documents" />}
      {error && (
        <p role="alert" className="rounded bg-danger-tint px-4 py-3 text-sm text-danger">
          {error} <button onClick={() => void reload()} className="ml-1 underline">Try again</button>
        </p>
      )}
      {!loading && !error && documents.length === 0 && (
        <div className="rounded-lg border border-dashed border-rule px-4 py-10 text-center">
          <p className="font-medium">Your knowledge base is empty</p>
          <p className="mt-1 text-sm text-muted">Choose a PDF above to make it searchable for students.</p>
        </div>
      )}
      {documents.length > 0 && <DocumentTable documents={documents} onDelete={(d) => { setDeleteError(null); setToDelete(d); }} />}

      <ConfirmDialog open={!!toDelete} title="Delete this document?"
        message={`"${toDelete?.title || toDelete?.filename}" will be removed from the app and from the search index. Answers will no longer cite it.`}
        confirmLabel="Delete document" busy={deleting} error={deleteError} onConfirm={() => void confirmDelete()} onCancel={() => setToDelete(null)} />
    </>
  );
}
