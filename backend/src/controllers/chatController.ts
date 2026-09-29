import { Request, Response } from 'express';
import { chatService } from '../services/chatService';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';

export const chatController = {
  send: async (req: Request, res: Response) => ok(res, await chatService.sendMessage(req.user!, req.body)),
  stream: async (req: Request, res: Response) => {
    const abortController = new AbortController();
    req.on('aborted', () => abortController.abort());
    res.on('close', () => { if (!res.writableEnded) abortController.abort(); });
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    let streamStarted = false;

    try {
      for await (const event of chatService.streamMessage(req.user!, req.body, abortController.signal)) {
        if (abortController.signal.aborted) break;
        streamStarted = true;
        res.write(`${JSON.stringify(event)}\n`);
      }
    } catch (err) {
      if (!abortController.signal.aborted && !res.writableEnded) {
        if (!streamStarted && err instanceof AppError && err.status === 503) {
          res.status(503).json({ success: false, error: { code: err.code, message: err.message } });
          return;
        }
        const message = err instanceof Error ? err.message : 'The answer service is not responding. Please try again.';
        res.write(`${JSON.stringify({ type: 'error', message })}\n`);
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  },
};
