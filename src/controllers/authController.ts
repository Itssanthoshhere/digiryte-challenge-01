import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { dbStore } from '../services/dbStore';
import { TokenService } from '../services/tokenService';
import { AuthenticatedRequest } from '../types';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateTokens, verifyAccessToken, verifyRefreshToken } from '../utils/jwt';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name, role } = req.body;

      const existingUser = await dbStore.findUserByEmail(email);
      if (existingUser) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
      }

      const passwordHash = await hashPassword(password);
      const user = await dbStore.createUser({
        email,
        passwordHash,
        name,
        role: role || 'USER',
      });

      const tokens = generateTokens(user.id, user.email, user.role);
      await TokenService.storeRefreshToken(user.id, tokens.refreshToken);

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
          },
          tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await dbStore.findUserByEmail(email);
      if (!user) {
        throw new AppError('Invalid email or password credentials', 401, 'INVALID_CREDENTIALS');
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new AppError('Invalid email or password credentials', 401, 'INVALID_CREDENTIALS');
      }

      const tokens = generateTokens(user.id, user.email, user.role);
      await TokenService.storeRefreshToken(user.id, tokens.refreshToken);

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
          },
          tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      const payload = verifyRefreshToken(refreshToken);
      const user = await dbStore.findUserById(payload.sub);
      if (!user) {
        throw new AppError('User belonging to this token no longer exists', 401, 'USER_NOT_FOUND');
      }

      // Rotate tokens
      const newTokens = generateTokens(user.id, user.email, user.role);
      await TokenService.storeRefreshToken(user.id, newTokens.refreshToken);

      res.status(200).json({
        status: 'success',
        data: {
          tokens: newTokens,
        },
      });
    } catch (error) {
      next(new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN'));
    }
  }

  /**
   * Logout - Invalidate/Revoke current access token in Redis blocklist before natural expiry.
   */
  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError('Authorization header missing', 401, 'UNAUTHORIZED');
      }

      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);

      // Add access token's JTI to Redis blocklist until expiration
      await TokenService.revokeToken(payload);

      res.status(200).json({
        status: 'success',
        message: 'Successfully logged out. Access token has been revoked and invalidated in Redis store.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('User context missing', 401, 'UNAUTHORIZED');
      const user = await dbStore.findUserById(req.user.id);
      if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
