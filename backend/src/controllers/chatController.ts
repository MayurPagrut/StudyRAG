import { Request, Response } from 'express';
import { chatService } from '../services/chatService';
import { ok } from '../utils/apiResponse';

export const chatController = {
  send: async (req: Request, res: Response) => ok(res, await chatService.sendMessage(req.user!, req.body)),
};
