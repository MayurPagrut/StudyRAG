import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/asyncHandler';
import { chatSchema } from '../utils/schemas';

export const chatRoutes = Router();
chatRoutes.post('/', authenticate, validate(chatSchema), h(chatController.send));
