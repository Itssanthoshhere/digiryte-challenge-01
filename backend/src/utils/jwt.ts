import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JWTPayload, UserRole } from '../types';
import { generateUUID } from './crypto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  jti: string;
  refreshJti: string;
}

export const generateTokens = (userId: string, email: string, role: UserRole): TokenPair => {
  const jti = generateUUID();
  const refreshJti = generateUUID();

  const accessPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    jti,
    sub: userId,
    email,
    role,
    type: 'access',
  };

  const refreshPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    jti: refreshJti,
    sub: userId,
    email,
    role,
    type: 'refresh',
  };

  const accessOptions: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRATION as SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: 'digiryte-secure-api',
    audience: 'digiryte-client',
  };

  const refreshOptions: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRATION as SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: 'digiryte-secure-api',
    audience: 'digiryte-client',
  };

  const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, accessOptions);
  const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, refreshOptions);

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRATION,
    jti,
    refreshJti,
  };
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'digiryte-secure-api',
      audience: 'digiryte-client',
    }) as JWTPayload;

    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return payload;
  } catch {
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
      issuer: 'digiryte-secure-api',
      audience: 'digiryte-client',
    }) as JWTPayload;

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return payload;
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Calculates remaining lifetime in seconds for a decoded JWT.
 */
export const getTokenRemainingTTLSeconds = (payload: JWTPayload): number => {
  if (!payload.exp) return 900; // Fallback to 15 mins (900s)
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const ttl = payload.exp - nowInSeconds;
  return ttl > 0 ? ttl : 0;
};
