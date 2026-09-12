import { Request } from 'express';

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface JWTPayload {
  jti: string;
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    jti: string;
  };
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  ownerId: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  nonce: string;
  createdAt: string;
}

export interface ApiErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}
