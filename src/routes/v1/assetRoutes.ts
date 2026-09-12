import { Router } from 'express';
import { AssetController } from '../../controllers/assetController';
import { authenticateJWT } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validate';
import { createAssetSchema, deleteAssetSchema } from '../../schemas/assetSchemas';

const router = Router();

// All asset routes require authentication
router.use(authenticateJWT);

// GET /api/v1/assets - Accessible to USER and ADMIN (RBAC enforced internally)
router.get('/', authorizeRoles('USER', 'ADMIN'), AssetController.listAssets);

// POST /api/v1/assets - Accessible to USER and ADMIN
router.post('/', authorizeRoles('USER', 'ADMIN'), validateRequest(createAssetSchema), AssetController.createAsset);

// DELETE /api/v1/assets/:id - Accessible to USER (own only) and ADMIN (any asset)
router.delete('/:id', authorizeRoles('USER', 'ADMIN'), validateRequest(deleteAssetSchema), AssetController.deleteAsset);

export default router;
