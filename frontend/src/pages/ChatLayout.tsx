import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Sidebar } from '../components/Sidebar';
import { conversationApi } from '../services/conversationApi';
import { errorMessage } from '../services/api';
import { Conversation } from '../types';

export interface ChatLayoutContext {
  conversations: Conversation[];
  reloadConversations: () => Promise<void>;
  openSidebar: () => void;
}

export default function ChatLayout() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try { setConversations(await conversationApi.getConversations()); setError(null); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true); setDeleteError(null);
    try {
      await conversationApi.delete(toDelete.id);
      setConversations((cs) => cs.filter((c) => c.id !== toDelete.id));
      if (conversationId === toDelete.id) navigate('/app');
      setToDelete(null);
    } catch (e) { setDeleteError(errorMessage(e)); }
    finally { setDeleting(false); }
  }

  const ctx: ChatLayoutContext = { conversations, reloadConversations: reload, openSidebar: () => setSidebarOpen(true) };
  return (
    <div className="flex h-dvh">
      <Sidebar conversations={conversations} loading={loading} error={error} open={sidebarOpen}
        onClose={() => setSidebarOpen(false)} onRetry={() => void reload()}
        onNew={() => { setSidebarOpen(false); navigate('/app'); }}
        onDelete={(c) => { setDeleteError(null); setToDelete(c); }} />
      <div className="min-w-0 flex-1"><Outlet context={ctx} /></div>
      <ConfirmDialog open={!!toDelete} title="Delete this chat?" message={`"${toDelete?.title ?? ''}" and all of its messages will be permanently removed.`}
        confirmLabel="Delete chat" busy={deleting} error={deleteError} onConfirm={() => void confirmDelete()} onCancel={() => setToDelete(null)} />
    </div>
  );
}
