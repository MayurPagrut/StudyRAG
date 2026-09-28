import { ChatMessage, Conversation } from '../types';
import { api } from './api';

export const conversationApi = {
  getConversations: () => api.get<Conversation[]>('/conversations'),
  create: (title?: string) => api.post<Conversation>('/conversations', title ? { title } : {}),
  get: (id: string) => api.get<Conversation>(`/conversations/${id}`),
  getMessages: (id: string) => api.get<ChatMessage[]>(`/conversations/${id}/messages`),
  delete: (id: string) => api.delete<{ id: string; deleted: boolean }>(`/conversations/${id}`),
};
