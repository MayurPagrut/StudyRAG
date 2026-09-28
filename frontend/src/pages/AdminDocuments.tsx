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

  async function upload(file: File, meta: UploadMeta) {
    await documentApi.upload(file, meta);
    await reload();
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
      <h1 className="font-serif text-2xl font-semibold">Documents</h1>
      <div className="mt-6"><UploadDropzone onUpload={upload} /></div>

      <h2 className="mb-3 mt-10 font-serif text-lg font-semibold">All documents</h2>
      {loading && <Spinner label="Loading documents" />}
      {error && (
        <p role="alert" className="rounded bg-danger-tint px-4 py-3 text-sm text-danger">
          {error} <button onClick={() => void reload()} className="ml-1 underline">Try again</button>
        </p>
      )}
      {!loading && !error && documents.length === 0 && (
        <p className="rounded-lg border border-dashed border-rule px-4 py-10 text-center text-muted">No documents yet. Upload a PDF above to make it searchable for students.</p>
      )}
      {documents.length > 0 && <DocumentTable documents={documents} onDelete={(d) => { setDeleteError(null); setToDelete(d); }} />}

      <ConfirmDialog open={!!toDelete} title="Delete this document?"
        message={`"${toDelete?.title || toDelete?.filename}" will be removed from the app and from the search index. Answers will no longer cite it.`}
        confirmLabel="Delete document" busy={deleting} error={deleteError} onConfirm={() => void confirmDelete()} onCancel={() => setToDelete(null)} />
    </>
  );
}
