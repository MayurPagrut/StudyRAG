import { Link } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { useDocuments } from '../hooks/useDocuments';

export default function AdminDashboard() {
  const { documents, loading, error, reload } = useDocuments();
  const count = (f: (s: string) => boolean) => documents.filter((d) => f(d.status)).length;
  const stats = [
    { label: 'Total documents', value: documents.length, tone: 'text-ink' },
    { label: 'Ready', value: count((s) => s === 'ready'), tone: 'text-moss-dark' },
    { label: 'Processing', value: count((s) => s === 'processing' || s === 'uploading'), tone: 'text-ochre' },
    { label: 'Failed', value: count((s) => s === 'failed'), tone: 'text-danger' },
  ];

  return (
    <>
      <h1 className="font-serif text-2xl font-semibold">Overview</h1>
      {loading && <div className="mt-6"><Spinner label="Loading documents" /></div>}
      {error && (
        <p role="alert" className="mt-6 rounded bg-danger-tint px-4 py-3 text-sm text-danger">
          {error} <button onClick={() => void reload()} className="ml-1 underline">Try again</button>
        </p>
      )}
      {!loading && !error && (
        <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-rule bg-white p-4">
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className={`mt-1 font-serif text-4xl font-semibold ${s.tone}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-8"><Link to="/admin/documents" className="rounded-md bg-moss px-4 py-2 text-sm font-medium text-white hover:bg-moss-dark">Manage documents</Link></p>
    </>
  );
}
