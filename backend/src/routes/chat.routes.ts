import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chatController } from '../controllers/chatController';
import { env } from '../config/env';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/asyncHandler';
import { chatSchema } from '../utils/schemas';

export const chatRoutes = Router();
const chatLimiter = rateLimit({
	windowMs: env.CHAT_RATE_LIMIT_WINDOW_MS,
	limit: env.CHAT_RATE_LIMIT_MAX,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many chat requests. Try again later.' } },
});
chatRoutes.post('/', authenticate, chatLimiter, validate(chatSchema), h(chatController.send));
chatRoutes.post('/stream', authenticate, chatLimiter, validate(chatSchema), h(chatController.stream));
