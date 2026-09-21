import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { dbStore } from '../services/dbStore';
import { TokenService } from '../services/tokenService';
import { AuthenticatedRequest } from '../types';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateTokens, verifyAccessToken, verifyRefreshToken } from '../utils/jwt';

// Pre-computed dummy hash to guarantee constant-time execution during failed logins (prevents timing attack account enumeration)
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;

      const existingUser = await dbStore.findUserByEmail(email);
      if (existingUser) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
      }

      const passwordHash = await hashPassword(password);
      // 'role' is ALWAYS forced to 'USER' for public self-registration (prevents privilege escalation)
      const user = await dbStore.createUser({
        email,
        passwordHash,
        name,
        role: 'USER',
      });

      const tokens = generateTokens(user.id, user.email, user.role);
      await TokenService.storeRefreshToken(user.id, tokens.refreshJti);

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
      
      // Constant-time execution check: if user is not found, verify against dummy hash to prevent timing attack enumeration
      if (!user) {
        await verifyPassword(password, DUMMY_HASH);
        throw new AppError('Invalid email or password credentials', 401, 'INVALID_CREDENTIALS');
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new AppError('Invalid email or password credentials', 401, 'INVALID_CREDENTIALS');
      }

      const tokens = generateTokens(user.id, user.email, user.role);
      await TokenService.storeRefreshToken(user.id, tokens.refreshJti);

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

  /**
   * Refresh Token Endpoint — Implements Refresh Token Rotation & Theft/Reuse Detection
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400, 'BAD_REQUEST');
      }

      const payload = verifyRefreshToken(refreshToken);

      // Check if this exact refresh token is still active in Redis
      const isActive = await TokenService.isRefreshTokenActive(payload.sub, payload.jti);
      if (!isActive) {
        // Token reuse or stolen token detected! Revoke ALL active refresh sessions for this user.
        await TokenService.revokeAllForUser(payload.sub);
        throw new AppError('Refresh token reuse detected. All active sessions have been revoked for security.', 401, 'TOKEN_REUSE');
      }

      const user = await dbStore.findUserById(payload.sub);
      if (!user) {
        throw new AppError('User belonging to this token no longer exists', 401, 'USER_NOT_FOUND');
      }

      // Burn old refresh token
      await TokenService.invalidateRefreshToken(payload.sub, payload.jti);

      // Issue fresh token pair (Rotation)
      const newTokens = generateTokens(user.id, user.email, user.role);
      await TokenService.storeRefreshToken(user.id, newTokens.refreshJti);

      res.status(200).json({
        status: 'success',
        data: {
          tokens: newTokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout — Invalidates both access token and refresh token in Redis.
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

      // Also invalidate refresh token if passed in body
      if (req.body?.refreshToken) {
        try {
          const refreshPayload = verifyRefreshToken(req.body.refreshToken);
          await TokenService.invalidateRefreshToken(refreshPayload.sub, refreshPayload.jti);
        } catch {
          // Ignore invalid refresh token during logout
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Successfully logged out. Access token and Refresh token have been invalidated in Redis store.',
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
