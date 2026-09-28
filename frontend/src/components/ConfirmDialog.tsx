import { useEffect, useRef } from 'react';
import { Spinner } from './Spinner';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, busy, error, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="dlg-title" className="font-serif text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        {error && <p role="alert" className="mt-3 rounded bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} onClick={onCancel} disabled={busy} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-sage disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60">
            {busy && <Spinner />}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
