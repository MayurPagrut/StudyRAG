const PATHS = {
  plus: 'M12 5v14M5 12h14',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  send: 'M5 12l14-7-5 14-2-6-7-1z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5',
} as const;

export function Icon({ name, className = 'size-5' }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
