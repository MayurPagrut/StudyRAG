import { Router } from 'express';
import { env } from '../config/env';
import { adminDocumentRoutes } from './admin.document.routes';
import { authRoutes } from './auth.routes';
import { chatRoutes } from './chat.routes';
import { conversationRoutes } from './conversation.routes';

export const routes = Router();
routes.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', ragMode: env.RAG_MODE } });
});
routes.use('/auth', authRoutes);
routes.use('/chat', chatRoutes);
routes.use('/conversations', conversationRoutes);
routes.use('/admin/documents', adminDocumentRoutes);
