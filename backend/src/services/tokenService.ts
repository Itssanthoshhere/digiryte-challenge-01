import { redisStore } from '../config/redis';
import { JWTPayload } from '../types';
import { getTokenRemainingTTLSeconds } from '../utils/jwt';

const BLOCKLIST_PREFIX = 'token:revoked:';
const REFRESH_TOKEN_PREFIX = 'token:refresh:';

export class TokenService {
  /**
   * Invalidates/Revokes an access token before its natural expiration
   * by adding its `jti` to the Redis blocklist.
   */
  static async revokeToken(payload: JWTPayload): Promise<void> {
    const ttl = getTokenRemainingTTLSeconds(payload);
    if (ttl > 0) {
      const key = `${BLOCKLIST_PREFIX}${payload.jti}`;
      await redisStore.set(key, 'true', 'EX', ttl);
    }
  }

  /**
   * Checks whether a specific token's `jti` is present in the revocation blocklist.
   */
  static async isTokenRevoked(jti: string): Promise<boolean> {
    const key = `${BLOCKLIST_PREFIX}${jti}`;
    const value = await redisStore.get(key);
    return value !== null;
  }

  /**
   * Stores an active refresh token for a user.
   */
  static async storeRefreshToken(userId: string, jti: string, ttlSeconds = 604800): Promise<void> {
    const key = `${REFRESH_TOKEN_PREFIX}${userId}:${jti}`;
    await redisStore.set(key, 'valid', 'EX', ttlSeconds);
  }

  /**
   * Checks if a refresh token is still active in Redis.
   */
  static async isRefreshTokenActive(userId: string, jti: string): Promise<boolean> {
    const key = `${REFRESH_TOKEN_PREFIX}${userId}:${jti}`;
    const value = await redisStore.get(key);
    return value !== null;
  }

  /**
   * Invalidate a specific refresh token.
   */
  static async invalidateRefreshToken(userId: string, jti: string): Promise<void> {
    const key = `${REFRESH_TOKEN_PREFIX}${userId}:${jti}`;
    await redisStore.del(key);
  }

  /**
   * Revokes all active refresh tokens for a user (used when token reuse / theft is detected).
   */
  static async revokeAllForUser(userId: string): Promise<void> {
    const pattern = `${REFRESH_TOKEN_PREFIX}${userId}:*`;
    const keys = await redisStore.keys(pattern);
    if (keys && keys.length > 0) {
      for (const k of keys) {
        await redisStore.del(k);
      }
    }
  }
}
