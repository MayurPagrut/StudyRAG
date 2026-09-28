import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export function ProtectedRoute({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid h-full place-items-center"><Spinner label="Loading your session" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : '/app');
