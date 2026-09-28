import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout, fieldCls, primaryBtn } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../routes/ProtectedRoute';
import { errorMessage } from '../services/api';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { const u = await register(name, email, password); navigate(homeFor(u.role), { replace: true }); }
    catch (err) { setError(errorMessage(err)); setBusy(false); }
  }

  return (
    <AuthLayout title="Create your account" subtitle="It takes a few seconds.">
      <form onSubmit={submit} className="space-y-4">
        <div><label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
          <input id="name" required maxLength={100} autoComplete="name" className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" type="email" required autoComplete="email" className={fieldCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input id="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" aria-describedby="pw-hint" className={fieldCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p id="pw-hint" className="mt-1 text-xs text-muted">At least 8 characters.</p></div>
        {error && <p role="alert" className="rounded bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
        <button disabled={busy} className={primaryBtn}>{busy ? 'Creating account...' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-sm text-muted">Already registered? <Link to="/login" className="font-medium text-moss underline">Sign in</Link></p>
    </AuthLayout>
  );
}
