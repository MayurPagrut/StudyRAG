import { NextFunction, Request, Response } from 'express';
import { userRepository } from '../repositories/userRepository';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    let payload;
    try {
      payload = verifyToken(header.slice(7));
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Session expired or invalid. Please sign in again.');
    }
    // Load from DB so role changes / deleted accounts take effect immediately.
    const user = await userRepository.findById(payload.sub);
    if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Account no longer exists');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
