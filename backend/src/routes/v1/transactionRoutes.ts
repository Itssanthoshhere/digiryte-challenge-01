import { Router } from 'express';
import { TransactionController } from '../../controllers/transactionController';
import { authenticateJWT } from '../../middleware/authenticate';
import { preventReplayAttack } from '../../middleware/preventReplay';
import { sensitiveRateLimiter } from '../../middleware/rateLimiter';
import { validateRequest } from '../../middleware/validate';
import { transferTransactionSchema } from '../../schemas/transactionSchemas';

const router = Router();

router.use(authenticateJWT);

// Sensitive transfer endpoint protected by Anti-Replay defense and Rate limiting
router.post(
  '/transfer',
  sensitiveRateLimiter,
  preventReplayAttack,
  validateRequest(transferTransactionSchema),
  TransactionController.transfer
);

router.get('/', TransactionController.listTransactions);

export default router;
