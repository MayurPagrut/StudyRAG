import { conversationRepository } from '../repositories/conversationRepository';
import { messageRepository } from '../repositories/messageRepository';
import { ragService } from './rag';
import { User } from '../types';
import { AppError } from '../utils/AppError';

const HISTORY_LIMIT = 10;
const DEFAULT_TITLE = 'New chat';
const makeTitle = (q: string) => (q.length > 60 ? `${q.slice(0, 57).trimEnd()}...` : q);

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
};
