import { Request, Response } from 'express';
import { documentService } from '../services/documentService';
import { ok } from '../utils/apiResponse';

export const documentController = {
  // 202: the document is stored and queued; processing continues in the background.
  upload: async (req: Request, res: Response) => ok(res, await documentService.upload(req.user!.id, req.file, req.body), 202),
  list: async (_req: Request, res: Response) => ok(res, await documentService.list()),
  get: async (req: Request, res: Response) => ok(res, await documentService.get(req.params.id)),
  remove: async (req: Request, res: Response) => {
    await documentService.remove(req.params.id);
    return ok(res, { id: req.params.id, deleted: true });
  },
};
