import { ChatRequest, ChatResponse, ChatStreamEvent } from '../types';
import { ApiError, api } from './api';

export const chatApi = {
  sendMessage: (req: ChatRequest) => api.post<ChatResponse>('/chat', req),
  async streamMessage(req: ChatRequest, onEvent: (event: ChatStreamEvent) => void, signal?: AbortSignal): Promise<void> {
    const response = await api.stream('/chat/stream', req, signal);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const consume = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line) as ChatStreamEvent;
      if (event.type === 'error') throw new ApiError('RAG_UNAVAILABLE', event.message, 502);
      onEvent(event);
    };

    try {
      let done = false;
      while (!done) {
        const part = await reader.read();
        buffer += decoder.decode(part.value, { stream: !part.done });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        lines.forEach(consume);
        done = part.done;
      }
      if (buffer.trim()) consume(buffer);
    } finally {
      reader.releaseLock();
    }
  },
};
