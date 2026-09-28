import { ChatMessage } from '../types';
import { SourceCard } from './SourceCard';

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-moss px-4 py-2.5 text-white">{message.content}</p>
      </div>
    );
  }
  const sources = message.sources ?? [];
  return (
    <article className="max-w-[46rem]">
      <p className="whitespace-pre-wrap break-words font-serif text-[1.05rem] leading-relaxed">{message.content}</p>
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
