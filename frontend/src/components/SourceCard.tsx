import { Source } from '../types';

export function SourceCard({ source }: { source: Source }) {
  return (
    <li className="rounded-md border border-rule border-l-4 border-l-ochre bg-white px-3 py-2 text-sm">
      <p className="truncate font-medium" title={source.documentName}>📄 {source.documentName}</p>
      <p className="text-muted">Page {source.page}</p>
      {source.similarity !== undefined && <p className="text-muted">Similarity: {source.similarity.toFixed(4)}</p>}
    </li>
  );
}
