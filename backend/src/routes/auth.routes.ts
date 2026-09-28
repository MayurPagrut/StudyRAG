import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/asyncHandler';
import { loginSchema, registerSchema } from '../utils/schemas';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' } },
});

export const authRoutes = Router();
authRoutes.post('/register', limiter, validate(registerSchema), h(authController.register));
authRoutes.post('/login', limiter, validate(loginSchema), h(authController.login));
authRoutes.post('/logout', authenticate, h(authController.logout));
authRoutes.get('/me', authenticate, h(authController.me));
