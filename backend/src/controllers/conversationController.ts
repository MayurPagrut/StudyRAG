import { Request, Response } from 'express';
import { conversationService } from '../services/conversationService';
import { ok } from '../utils/apiResponse';

export const conversationController = {
  create: async (req: Request, res: Response) => ok(res, await conversationService.create(req.user!.id, req.body.title), 201),
  list: async (req: Request, res: Response) => ok(res, await conversationService.list(req.user!.id)),
  get: async (req: Request, res: Response) => ok(res, await conversationService.get(req.params.id, req.user!.id)),
  messages: async (req: Request, res: Response) => ok(res, await conversationService.messages(req.params.id, req.user!.id)),
  remove: async (req: Request, res: Response) => {
    await conversationService.remove(req.params.id, req.user!.id);
    return ok(res, { id: req.params.id, deleted: true });
  },
};
