import { useCallback, useEffect, useState } from 'react';
import { documentApi } from '../services/documentApi';
import { errorMessage } from '../services/api';
import { DocumentItem } from '../types';

const TRANSIENT = ['uploading', 'processing', 'deleting'];

/** Loads the document list and polls every 3s while any document is still changing state. */
export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try { setDocuments(await documentApi.list()); setError(null); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const busy = documents.some((d) => TRANSIENT.includes(d.status));
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => void reload(), 3000);
    return () => clearInterval(t);
  }, [busy, reload]);

  return { documents, loading, error, reload };
}
