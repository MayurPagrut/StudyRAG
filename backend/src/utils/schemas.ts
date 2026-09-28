import { z } from 'zod';

const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional());

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be at most 72 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const chatSchema = z.object({
  conversationId: z.string().uuid().nullish(),
  question: z.string().trim().min(1, 'Question cannot be empty').max(2000, 'Question must be 2000 characters or fewer'),
});

export const idParamSchema = z.object({ id: z.string().uuid('Invalid id') });

export const createConversationSchema = z.object({ title: z.string().trim().min(1).max(120).optional() });

export const uploadMetaSchema = z.object({
  title: optionalText(200),
  subject: optionalText(100),
  description: optionalText(1000),
});
