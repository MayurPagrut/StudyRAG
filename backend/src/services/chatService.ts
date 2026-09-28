import { conversationRepository } from '../repositories/conversationRepository';
import { messageRepository } from '../repositories/messageRepository';
import { ragService } from './rag';
import { RagSource, User } from '../types';
import { AppError } from '../utils/AppError';
import { RagStreamEvent } from './rag/RagService';

const HISTORY_LIMIT = 10;
const DEFAULT_TITLE = 'New chat';
const makeTitle = (q: string) => (q.length > 60 ? `${q.slice(0, 57).trimEnd()}...` : q);

export type ChatStreamEvent =
  | { type: 'start'; conversationId: string; userMessage: { id: string; role: 'user'; content: string; createdAt: string } }
  | { type: 'token'; text: string }
  | { type: 'sources'; sources: RagSource[] }
  | { type: 'done'; conversationId: string; message: { id: string; role: 'assistant'; content: string; createdAt: string }; sources: RagSource[] };

export const chatService = {
  async sendMessage(user: User, input: { conversationId?: string | null; question: string }) {
    let conversation;
    let isFirstMessage = false;

    if (input.conversationId) {
      conversation = await conversationRepository.findOwned(input.conversationId, user.id);
      if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    } else {
      conversation = await conversationRepository.create(user.id, makeTitle(input.question));
      isFirstMessage = true;
    }

    const history = isFirstMessage ? [] : await messageRepository.recent(conversation.id, HISTORY_LIMIT);
    if (!isFirstMessage && history.length === 0 && conversation.title === DEFAULT_TITLE) {
      await conversationRepository.setTitle(conversation.id, makeTitle(input.question)); // chat created via POST /conversations
    }

    const userMessage = await messageRepository.create({ conversationId: conversation.id, role: 'user', content: input.question });

    let result;
    try {
      result = await ragService.query({
        question: input.question,
        conversationId: conversation.id,
        history: history.map(({ role, content }) => ({ role, content })),
      });
    } catch (err) {
      console.error('[rag.query failed]', err);
      // Undo the user turn so the conversation never contains an unanswered question.
      await messageRepository.remove(userMessage.id);
      if (isFirstMessage) await conversationRepository.remove(conversation.id, user.id);
      throw new AppError(502, 'RAG_UNAVAILABLE', 'The answer service is not responding. Please try again in a moment.');
    }

    const assistant = await messageRepository.create({
      conversationId: conversation.id, role: 'assistant', content: result.answer, sources: result.sources,
    });
    await conversationRepository.touch(conversation.id);

    return {
      conversationId: conversation.id,
      userMessage: { id: userMessage.id, role: userMessage.role, content: userMessage.content, createdAt: userMessage.createdAt },
      message: { id: assistant.id, role: assistant.role, content: assistant.content, createdAt: assistant.createdAt },
      sources: result.sources,
    };
  },

  async *streamMessage(user: User, input: { conversationId?: string | null; question: string }, signal?: AbortSignal): AsyncIterable<ChatStreamEvent> {
    let conversation;
    let isFirstMessage = false;

    if (input.conversationId) {
      conversation = await conversationRepository.findOwned(input.conversationId, user.id);
      if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    } else {
      conversation = await conversationRepository.create(user.id, makeTitle(input.question));
      isFirstMessage = true;
    }

    const history = isFirstMessage ? [] : await messageRepository.recent(conversation.id, HISTORY_LIMIT);
    if (!isFirstMessage && history.length === 0 && conversation.title === DEFAULT_TITLE) {
      await conversationRepository.setTitle(conversation.id, makeTitle(input.question));
    }

    const userMessage = await messageRepository.create({ conversationId: conversation.id, role: 'user', content: input.question });
    let assistantCreated = false;
    let answer = '';
    let sources: RagSource[] = [];

    try {
      yield {
        type: 'start',
        conversationId: conversation.id,
        userMessage: { id: userMessage.id, role: 'user', content: userMessage.content, createdAt: userMessage.createdAt },
      };

      for await (const event of ragService.streamQuery({
        question: input.question,
        conversationId: conversation.id,
        history: history.map(({ role, content }) => ({ role, content })),
      }, signal)) {
        if (signal?.aborted) throw new Error('Streaming request cancelled');
        if (event.type === 'token') {
          answer += event.text;
          yield event;
        } else {
          sources = event.sources;
          yield event;
        }
      }

      if (signal?.aborted) throw new Error('Streaming request cancelled');
      const assistant = await messageRepository.create({
        conversationId: conversation.id, role: 'assistant', content: answer, sources,
      });
      assistantCreated = true;
      await conversationRepository.touch(conversation.id);

      yield {
        type: 'done',
        conversationId: conversation.id,
        message: { id: assistant.id, role: 'assistant', content: assistant.content, createdAt: assistant.createdAt },
        sources,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error('[rag.streamQuery failed]', err);
      throw new AppError(502, 'RAG_UNAVAILABLE', 'The answer service is not responding. Please try again in a moment.');
    } finally {
      if (!assistantCreated) {
        await messageRepository.remove(userMessage.id).catch(() => undefined);
        if (isFirstMessage) await conversationRepository.remove(conversation.id, user.id).catch(() => undefined);
      }
    }
  },
};
