import { Router } from 'express';
import { AuthController } from '../../controllers/authController';
import { authenticateJWT } from '../../middleware/authenticate';
import { sensitiveRateLimiter } from '../../middleware/rateLimiter';
import { validateRequest } from '../../middleware/validate';
import { loginSchema, refreshTokenSchema, registerSchema } from '../../schemas/authSchemas';

const router = Router();

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', sensitiveRateLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/refresh', sensitiveRateLimiter, validateRequest(refreshTokenSchema), AuthController.refreshToken);
router.post('/logout', authenticateJWT, AuthController.logout);
router.get('/me', authenticateJWT, AuthController.getProfile);

export default router;
