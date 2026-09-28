import { Router } from 'express';
import { conversationController as c } from '../controllers/conversationController';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/asyncHandler';
import { createConversationSchema, idParamSchema } from '../utils/schemas';

export const conversationRoutes = Router();
conversationRoutes.use(authenticate);
conversationRoutes.post('/', validate(createConversationSchema), h(c.create));
conversationRoutes.get('/', h(c.list));
conversationRoutes.get('/:id', validate(idParamSchema, 'params'), h(c.get));
conversationRoutes.get('/:id/messages', validate(idParamSchema, 'params'), h(c.messages));
conversationRoutes.delete('/:id', validate(idParamSchema, 'params'), h(c.remove));
