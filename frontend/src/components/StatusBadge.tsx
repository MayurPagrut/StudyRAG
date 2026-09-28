import { DocumentStatus } from '../types';

const STYLES: Record<DocumentStatus, { label: string; cls: string; pulse?: boolean }> = {
  uploading: { label: 'Uploading', cls: 'bg-sage text-muted', pulse: true },
  processing: { label: 'Processing', cls: 'bg-ochre-tint text-ochre', pulse: true },
  ready: { label: 'Ready', cls: 'bg-sage text-moss-dark' },
  failed: { label: 'Failed', cls: 'bg-danger-tint text-danger' },
  deleting: { label: 'Deleting', cls: 'bg-sage text-muted', pulse: true },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      <span className={`size-1.5 rounded-full bg-current ${s.pulse ? 'animate-pulse' : ''}`} aria-hidden />
      {s.label}
    </span>
  );
}
