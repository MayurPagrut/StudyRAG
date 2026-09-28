import { DocumentItem } from '../types';
import { formatBytes, formatDate } from '../utils/format';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';

export function DocumentTable({ documents, onDelete }: { documents: DocumentItem[]; onDelete: (d: DocumentItem) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-rule bg-white">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="border-b border-rule bg-sage/50 text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Document</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Subject</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Uploaded</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Size</th>
            <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {documents.map((d) => (
            <tr key={d.id} className="align-top">
              <td className="px-4 py-3">
                <p className="font-medium">{d.title || d.filename}</p>
                <p className="text-xs text-muted">{d.filename}{d.pageCount ? ` · ${d.pageCount} pages` : ''}</p>
                {d.status === 'failed' && d.errorMessage && <p className="mt-1 max-w-sm text-xs text-danger">{d.errorMessage}</p>}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">{d.subject ?? <span className="text-muted">-</span>}</td>
              <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
              <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">{formatDate(d.uploadedAt)}</td>
              <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">{formatBytes(d.fileSize)}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => onDelete(d)} disabled={d.status === 'processing' || d.status === 'uploading' || d.status === 'deleting'}
                  aria-label={`Delete ${d.title || d.filename}`} title={d.status === 'processing' ? 'Wait for processing to finish' : 'Delete'}
                  className="rounded p-2 text-muted hover:bg-danger-tint hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted">
                  <Icon name="trash" className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
