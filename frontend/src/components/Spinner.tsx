export function Spinner({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 text-sm text-muted ${className}`}>
      <span className="size-4 animate-spin rounded-full border-2 border-rule border-t-moss" aria-hidden />
      {label ?? <span className="sr-only">Loading</span>}
    </span>
  );
}
