import { ChatRequest, ChatResponse } from '../types';
import { api } from './api';

export const chatApi = {
  sendMessage: (req: ChatRequest) => api.post<ChatResponse>('/chat', req),
};
