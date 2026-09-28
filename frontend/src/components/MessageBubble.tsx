import { ChatMessage } from '../types';
import { SourceCard } from './SourceCard';

function removeInlineSourceMarkers(content: string): string {
  return content.replace(/\[\s*source\s*:[^\]]*\]/gi, '').replace(/[ \t]+\n/g, '\n').trim();
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-moss px-4 py-2.5 text-white">{message.content}</p>
      </div>
    );
  }
  const sources = message.sources ?? [];
  const answer = removeInlineSourceMarkers(message.content);
  const origin = message.sourceMode === 'rag'
    ? '📚 From uploaded material'
    : message.sourceMode === 'llm'
      ? '🤖 General AI knowledge'
      : message.sourceMode === 'hybrid'
        ? '📚 + 🤖 Uploaded material + General AI'
        : null;
  return (
    <article className="max-w-[46rem]">
      {origin && <p className="mb-2 text-sm font-medium text-muted" aria-label="Answer origin">{origin}</p>}
      <p className="whitespace-pre-wrap break-words font-serif text-[1.05rem] leading-relaxed">{answer}</p>
      {sources.length > 0 && (
        <section className="mt-4" aria-label="Sources">
          <h3 className="mb-2 text-sm font-semibold text-muted">Sources</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {sources.map((s, i) => <SourceCard key={`${s.documentId}-${s.page}-${s.chunkId ?? i}`} source={s} />)}
          </ul>
        </section>
      )}
    </article>
  );
}
