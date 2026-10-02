import { ReactNode } from 'react';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-full md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="hidden flex-col justify-between bg-side p-10 text-white md:flex">
        <span className="font-serif text-lg font-semibold">Naitik's Desk</span>
        <p className="max-w-sm font-serif text-3xl leading-snug">Ask a question. Get an answer with the page it came from.</p>
      </div>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

export const fieldCls = 'w-full rounded-md border border-rule bg-white px-3 py-2 outline-none focus:border-moss';
export const primaryBtn = 'w-full rounded-md bg-moss px-4 py-2.5 font-medium text-white hover:bg-moss-dark disabled:opacity-60';
