import { KeyboardEvent, useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface Props { value: string; onChange: (v: string) => void; onSend: () => void; disabled?: boolean }

export function ChatInput({ value, onChange, onSend, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="flex items-end gap-2 rounded-xl border border-rule bg-white p-2 focus-within:border-moss">
      <label htmlFor="question" className="sr-only">Your question</label>
      <textarea
        id="question" ref={ref} rows={1} value={value} maxLength={2000} disabled={disabled}
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
        placeholder="Ask something..."
        className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 outline-none placeholder:text-muted disabled:opacity-60"
      />
      <button onClick={onSend} disabled={!canSend} aria-label="Send question"
        className="grid size-10 shrink-0 place-items-center rounded-lg bg-moss text-white hover:bg-moss-dark disabled:bg-rule disabled:text-muted">
        <Icon name="send" />
      </button>
    </div>
  );
}
