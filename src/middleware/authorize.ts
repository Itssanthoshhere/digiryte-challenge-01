import { NextFunction, Response } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { AppError } from './errorHandler';

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('User authentication context missing.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: [${allowedRoles.join(', ')}]. Yours: ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
