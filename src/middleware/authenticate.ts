import { NextFunction, Response } from 'express';
import { TokenService } from '../services/tokenService';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './errorHandler';

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify token has not been revoked in Redis blocklist
    const isRevoked = await TokenService.isTokenRevoked(payload.jti);
    if (isRevoked) {
      throw new AppError('Token has been revoked or invalidated.', 401, 'TOKEN_REVOKED');
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError('Invalid or expired token.', 401, 'UNAUTHORIZED'));
  }
};
