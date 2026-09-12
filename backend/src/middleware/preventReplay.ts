import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { redisStore } from '../config/redis';
import { AppError } from './errorHandler';

const NONCE_REDIS_PREFIX = 'replay:nonce:';

export const preventReplayAttack = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const nonce = req.headers['x-nonce'] as string;
    const timestampStr = req.headers['x-timestamp'] as string;

    if (!nonce || typeof nonce !== 'string' || nonce.trim().length === 0) {
      throw new AppError(
        'Missing required security header: X-Nonce',
        400,
        'MISSING_NONCE_HEADER'
      );
    }

    if (!timestampStr || typeof timestampStr !== 'string') {
      throw new AppError(
        'Missing required security header: X-Timestamp',
        400,
        'MISSING_TIMESTAMP_HEADER'
      );
    }

    const requestTime = parseInt(timestampStr, 10);
    if (isNaN(requestTime)) {
      throw new AppError('Invalid timestamp format in X-Timestamp header', 400, 'INVALID_TIMESTAMP');
    }

    const currentTime = Date.now();
    // Allow timestamps provided in seconds or milliseconds
    const requestTimeMs = requestTime < 10000000000 ? requestTime * 1000 : requestTime;
    const diffInSeconds = Math.abs(currentTime - requestTimeMs) / 1000;

    if (diffInSeconds > env.REPLAY_MAX_TIMESTAMP_DIFF_SECONDS) {
      throw new AppError(
        `Request timestamp expired or out of bounds. Must be within ${env.REPLAY_MAX_TIMESTAMP_DIFF_SECONDS}s window.`,
        400,
        'EXPIRED_TIMESTAMP'
      );
    }

    // Verify nonce uniqueness in Redis store using setnx with TTL
    const nonceKey = `${NONCE_REDIS_PREFIX}${nonce}`;
    const isNewNonce = await redisStore.setnx(nonceKey, 'used', env.REPLAY_NONCE_TTL_SECONDS);

    if (!isNewNonce) {
      throw new AppError(
        'Replay attack detected! This X-Nonce has already been used.',
        409,
        'REPLAY_ATTACK_DETECTED'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
