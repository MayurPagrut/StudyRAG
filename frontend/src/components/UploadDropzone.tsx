import { DragEvent, useRef, useState } from 'react';
import { errorMessage } from '../services/api';
import { UploadMeta } from '../types';
import { formatBytes } from '../utils/format';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

const MAX_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 25);
const inputCls = 'w-full rounded-md border border-rule bg-white px-3 py-2 text-sm outline-none focus:border-moss';

export function UploadDropzone({ onUpload }: { onUpload: (file: File, meta: UploadMeta) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<UploadMeta>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) || (f.type && f.type !== 'application/pdf')) return setError('Only PDF files can be uploaded.');
    if (f.size > MAX_MB * 1024 * 1024) return setError(`That file is ${formatBytes(f.size)}. The limit is ${MAX_MB} MB.`);
    setError(null); setFile(f);
    setMeta((m) => ({ ...m, title: m.title || f.name.replace(/\.pdf$/i, '') }));
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); };
  const reset = () => { setFile(null); setMeta({}); setError(null); if (inputRef.current) inputRef.current.value = ''; };

  async function submit() {
    if (!file) return;
    setBusy(true); setError(null);
    try { await onUpload(file, meta); reset(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-lg border border-rule bg-white p-4">
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
          className={`grid place-items-center rounded-md border-2 border-dashed px-4 py-10 text-center ${dragging ? 'border-moss bg-sage' : 'border-rule'}`}>
          <Icon name="upload" className="size-7 text-moss" />
          <p className="mt-2 font-medium">Drag a PDF here</p>
          <p className="text-sm text-muted">or <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-moss underline">choose a file</button> (up to {MAX_MB} MB)</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-md bg-sage px-3 py-2">
            <Icon name="file" className="size-5 shrink-0 text-moss" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted">{formatBytes(file.size)}</p></div>
            <button onClick={reset} disabled={busy} className="rounded p-1 hover:bg-white/60 disabled:opacity-50" aria-label="Remove file"><Icon name="x" className="size-4" /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="up-title" className="mb-1 block text-sm font-medium">Title</label>
              <input id="up-title" className={inputCls} maxLength={200} value={meta.title ?? ''} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></div>
            <div><label htmlFor="up-subject" className="mb-1 block text-sm font-medium">Subject</label>
              <input id="up-subject" className={inputCls} maxLength={100} placeholder="e.g. Biology" value={meta.subject ?? ''} onChange={(e) => setMeta({ ...meta, subject: e.target.value })} /></div>
          </div>
          <div><label htmlFor="up-desc" className="mb-1 block text-sm font-medium">Description (optional)</label>
            <textarea id="up-desc" rows={2} className={inputCls} maxLength={1000} value={meta.description ?? ''} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></div>
          <div className="flex justify-end gap-3">
            <button onClick={reset} disabled={busy} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-sage disabled:opacity-50">Cancel</button>
            <button onClick={() => void submit()} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-medium text-white hover:bg-moss-dark disabled:opacity-60">
              {busy && <Spinner className="!text-white" />}Upload PDF
            </button>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {error && <p role="alert" className="mt-3 rounded bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
