import { Router } from 'express';
import assetRoutes from './assetRoutes';
import authRoutes from './authRoutes';
import transactionRoutes from './transactionRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/assets', assetRoutes);
router.use('/transactions', transactionRoutes);

export default router;
