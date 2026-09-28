import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ChatInput } from '../components/ChatInput';
import { Icon } from '../components/Icon';
import { MessageBubble } from '../components/MessageBubble';
import { Spinner } from '../components/Spinner';
import { chatApi } from '../services/chatApi';
import { conversationApi } from '../services/conversationApi';
import { errorMessage } from '../services/api';
import { ChatMessage, ChatStreamEvent, Source } from '../types';
import type { ChatLayoutContext } from './ChatLayout';

export default function ChatView() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { conversations, reloadConversations, openSidebar } = useOutletContext<ChatLayoutContext>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const skipLoadFor = useRef<string | null>(null); // set after we create a chat ourselves, so we don't refetch what we already have
  const activeId = useRef(conversationId);
  activeId.current = conversationId;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError(null);
    if (!conversationId) { setMessages([]); return; }
    if (skipLoadFor.current === conversationId) { skipLoadFor.current = null; return; }
    let cancelled = false;
    setLoadingHistory(true);
    conversationApi.getMessages(conversationId)
      .then((m) => { if (!cancelled) setMessages(m); })
      .catch((e) => { if (!cancelled) { setMessages([]); setError(errorMessage(e)); } })
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending]);

  async function send() {
    const question = draft.trim();
    if (!question || sending) return;
    const sentFrom = conversationId;
    const temp: ChatMessage = { id: `pending-${Date.now()}`, role: 'user', content: question, createdAt: new Date().toISOString() };
    setError(null); setDraft(''); setSending(true);
    setMessages((m) => [...m, temp]);
    const assistantId = `streaming-${Date.now()}`;
    let targetConversationId = sentFrom;
    let completed = false;
    let pendingSources: Source[] = [];
    try {
      await chatApi.streamMessage({ conversationId: sentFrom ?? null, question }, (event) => {
        if (event.type === 'start') {
          targetConversationId = event.conversationId;
          if (activeId.current !== sentFrom && activeId.current !== targetConversationId) return;
          const assistant: ChatMessage = { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString() };
          setMessages((m) => [...m.filter((x) => x.id !== temp.id), event.userMessage, assistant]);
          if (!sentFrom) {
            skipLoadFor.current = event.conversationId;
            navigate(`/app/chat/${event.conversationId}`);
          }
          return;
        }
        if (activeId.current !== targetConversationId) return;
        if (event.type === 'token') {
          setMessages((m) => m.map((message) => message.id === assistantId
            ? { ...message, content: message.content + event.text }
            : message));
        } else if (event.type === 'sources') {
          pendingSources = event.sources;
        } else if (event.type === 'done') {
          completed = true;
          setMessages((m) => m.map((message) => message.id === assistantId
            ? { ...event.message, sources: pendingSources }
            : message));
        }
      });
      if (!completed) throw new Error('The answer stream ended before completion.');
      void reloadConversations();
    } catch (e) {
      if (activeId.current === sentFrom || activeId.current === targetConversationId) {
        setMessages((m) => m.filter((x) => x.id !== temp.id && x.id !== assistantId));
      }
      setDraft(question); // give the question back so nothing is lost
      setError(errorMessage(e));
    } finally { setSending(false); }
  }

  const title = conversations.find((c) => c.id === conversationId)?.title ?? 'New chat';
  const isEmpty = messages.length === 0 && !loadingHistory && !sending;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-rule bg-white px-4 py-3">
        <button onClick={openSidebar} className="rounded p-1.5 hover:bg-sage md:hidden" aria-label="Open menu"><Icon name="menu" /></button>
        <h1 className="truncate font-serif text-lg font-semibold">{title}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
          {loadingHistory && <div className="py-10 text-center"><Spinner label="Loading messages" /></div>}
          {isEmpty && !error && (
            <div className="py-16 text-center">
              <h2 className="font-serif text-2xl font-semibold">What are you studying today?</h2>
              <p className="mx-auto mt-2 max-w-md text-muted">Ask a question about your course materials. Each answer lists the documents and pages it draws on.</p>
            </div>
          )}
          {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
          {sending && <Spinner label="Thinking..." className="pl-1" />}
          {error && (
            <div role="alert" className="flex items-start justify-between gap-3 rounded-md bg-danger-tint px-4 py-3 text-sm text-danger">
              <p>{error}</p>
              <button onClick={() => setError(null)} aria-label="Dismiss error" className="shrink-0"><Icon name="x" className="size-4" /></button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-rule bg-paper px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <ChatInput value={draft} onChange={setDraft} onSend={() => void send()} disabled={sending || loadingHistory} />
        </div>
      </div>
    </div>
  );
}
