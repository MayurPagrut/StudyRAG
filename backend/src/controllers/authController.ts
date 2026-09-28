import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { ok } from '../utils/apiResponse';

export const authController = {
  register: async (req: Request, res: Response) => ok(res, await authService.register(req.body), 201),
  login: async (req: Request, res: Response) => ok(res, await authService.login(req.body)),
  // JWTs are stateless: the client discards the token. Endpoint exists so clients have a uniform sign-out call.
  logout: async (_req: Request, res: Response) => ok(res, { loggedOut: true }),
  me: async (req: Request, res: Response) => ok(res, { user: req.user }),
};
