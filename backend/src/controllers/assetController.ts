import { NextFunction, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { dbStore } from '../services/dbStore';
import { AuthenticatedRequest } from '../types';

export class AssetController {
  /**
   * RBAC Enforced Listing:
   * - USER role: Returns only assets owned by the logged-in user.
   * - ADMIN role: Returns all system assets across all users.
   */
  static async listAssets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const assets = await dbStore.getAssets(req.user.id, req.user.role);

      res.status(200).json({
        status: 'success',
        results: assets.length,
        meta: {
          viewRole: req.user.role,
          scope: req.user.role === 'ADMIN' ? 'GLOBAL_SYSTEM_ALL' : 'USER_OWNED_ONLY',
        },
        data: { assets },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * RBAC Enforced Creation:
   * - USER role: Can only create assets owned by themselves.
   * - ADMIN role: Can assign ownership to any specified target user.
   */
  static async createAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const { name, type, value, ownerId } = req.body;
      const targetOwnerId = req.user.role === 'ADMIN' && ownerId ? ownerId : req.user.id;

      // Verify target owner exists
      const targetOwner = await dbStore.findUserById(targetOwnerId);
      if (!targetOwner) {
        throw new AppError('Specified owner user does not exist', 404, 'OWNER_NOT_FOUND');
      }

      const asset = await dbStore.createAsset({
        name,
        type,
        value,
        ownerId: targetOwnerId,
      });

      res.status(201).json({
        status: 'success',
        data: { asset },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * RBAC Enforced Deletion:
   * - USER role: Can ONLY delete assets they own.
   * - ADMIN role: Can delete ANY asset.
   */
  static async deleteAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const { id } = req.params;
      const asset = await dbStore.getAssetById(id);

      if (!asset) {
        throw new AppError(`Asset with ID '${id}' not found`, 404, 'ASSET_NOT_FOUND');
      }

      // Check ownership permissions
      if (req.user.role !== 'ADMIN' && asset.ownerId !== req.user.id) {
        throw new AppError(
          'Forbidden: You do not have permission to delete assets owned by other users.',
          403,
          'FORBIDDEN'
        );
      }

      await dbStore.deleteAsset(id);

      res.status(200).json({
        status: 'success',
        message: `Asset '${id}' deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }
}
