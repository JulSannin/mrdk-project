import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { loginValidator } from '../validators/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.post('/', authLimiter, loginValidator, login);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);
export default router;