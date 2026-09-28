import { conversationRepository } from '../repositories/conversationRepository';
import { messageRepository } from '../repositories/messageRepository';
import { AppError } from '../utils/AppError';

const notFound = () => new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

export const conversationService = {
  create: (userId: string, title?: string) => conversationRepository.create(userId, title ?? 'New chat'),
  list: (userId: string) => conversationRepository.listByUser(userId),

  async get(id: string, userId: string) {
    const c = await conversationRepository.findOwned(id, userId);
    if (!c) throw notFound();
    return c;
  },

  async messages(id: string, userId: string) {
    await this.get(id, userId);
    return messageRepository.listByConversation(id);
  },

  async remove(id: string, userId: string) {
    if (!(await conversationRepository.remove(id, userId))) throw notFound();
  },
};
