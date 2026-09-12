import { NextFunction, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { dbStore } from '../services/dbStore';
import { AuthenticatedRequest } from '../types';

export class TransactionController {
  /**
   * Sensitive Financial Transfer Endpoint protected by Anti-Replay Defense.
   * Requires valid X-Nonce and X-Timestamp headers.
   */
  static async transfer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const { recipientId, amount, currency } = req.body;
      const nonce = req.headers['x-nonce'] as string;

      if (req.user.id === recipientId) {
        throw new AppError('Self-transfers are not allowed', 400, 'INVALID_RECIPIENT');
      }

      const recipient = await dbStore.findUserById(recipientId);
      if (!recipient) {
        throw new AppError('Recipient user not found', 404, 'RECIPIENT_NOT_FOUND');
      }

      const transaction = await dbStore.createTransaction({
        senderId: req.user.id,
        recipientId,
        amount,
        currency: currency || 'USD',
        nonce,
      });

      res.status(201).json({
        status: 'success',
        message: 'Transaction processed securely.',
        data: {
          transaction: {
            id: transaction.id,
            senderId: transaction.senderId,
            recipientId: transaction.recipientId,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            nonceUsed: transaction.nonce,
            createdAt: transaction.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const transactions = await dbStore.getTransactionsForUser(req.user.id, req.user.role);

      res.status(200).json({
        status: 'success',
        results: transactions.length,
        data: { transactions },
      });
    } catch (error) {
      next(error);
    }
  }
}
