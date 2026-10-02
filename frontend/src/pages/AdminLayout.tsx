import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-side text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-serif text-lg font-semibold">Naitik's Desk <span className="font-sans text-sm font-normal text-white/60">Admin</span></span>
          <nav className="flex gap-1" aria-label="Admin">
            <NavLink to="/admin" end className={link}>Overview</NavLink>
            <NavLink to="/admin/documents" className={link}>Documents</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <NavLink to="/app" className="underline">Open chat</NavLink>
            <span className="hidden text-white/60 sm:inline">{user?.email}</span>
            <button onClick={() => void logout()} className="underline">Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8"><Outlet /></main>
    </div>
  );
}
