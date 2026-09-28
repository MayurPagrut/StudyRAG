import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout, fieldCls, primaryBtn } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../routes/ProtectedRoute';
import { errorMessage } from '../services/api';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from ?? homeFor(user.role)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { const u = await login(email, password); navigate(from ?? homeFor(u.role), { replace: true }); }
    catch (err) { setError(errorMessage(err)); setBusy(false); }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Pick up your study session.">
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" type="email" required autoComplete="email" className={fieldCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input id="password" type="password" required autoComplete="current-password" className={fieldCls} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p role="alert" className="rounded bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
        <button disabled={busy} className={primaryBtn}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p className="mt-6 text-sm text-muted">New here? <Link to="/register" className="font-medium text-moss underline">Create an account</Link></p>
    </AuthLayout>
  );
}
