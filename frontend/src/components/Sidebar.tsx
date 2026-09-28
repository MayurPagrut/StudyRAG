import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Conversation } from '../types';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

interface Props {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  open: boolean;
  onClose: () => void;
  onNew: () => void;
  onDelete: (c: Conversation) => void;
  onRetry: () => void;
}

export function Sidebar({ conversations, loading, error, open, onClose, onNew, onDelete, onRetry }: Props) {
  const { user, logout } = useAuth();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={onClose} aria-hidden />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-side text-white transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="font-serif text-lg font-semibold">Study Desk</span>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10 md:hidden" aria-label="Close menu"><Icon name="x" /></button>
        </div>
        <button onClick={onNew} className="mx-4 mt-4 flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20">
          <Icon name="plus" className="size-4" /> New chat
        </button>

        <nav className="mt-4 flex-1 overflow-y-auto px-2" aria-label="Conversations">
          {loading && <div className="px-2 py-2 text-white/70"><Spinner label="Loading chats" className="!text-white/70" /></div>}
          {error && (
            <div className="px-2 py-2 text-sm text-white/80">
              <p>{error}</p>
              <button onClick={onRetry} className="mt-1 underline">Try again</button>
            </div>
          )}
          {!loading && !error && conversations.length === 0 && <p className="px-2 py-2 text-sm text-white/60">Your chats will appear here.</p>}
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.id} className="group relative">
                <NavLink to={`/app/chat/${c.id}`} onClick={onClose}
                  className={({ isActive }) => `block truncate rounded-md py-2 pl-3 pr-9 text-sm ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`}>
                  {c.title}
                </NavLink>
                <button onClick={() => onDelete(c)} aria-label={`Delete chat: ${c.title}`}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100">
                  <Icon name="trash" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-4 text-sm">
          <p className="truncate font-medium">{user?.name}</p>
          <p className="truncate text-white/60">{user?.email}</p>
          <div className="mt-3 flex gap-4">
            {user?.role === 'admin' && <NavLink to="/admin" className="underline">Admin</NavLink>}
            <button onClick={() => void logout()} className="underline">Sign out</button>
          </div>
        </div>
      </aside>
    </>
  );
}
