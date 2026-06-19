import { Router } from 'express';
import { sendFeedback } from '../controllers/feedback.js';
import { feedbackValidator } from '../validators/feedback.js';
import { feedbackLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.post('/', feedbackLimiter, feedbackValidator, sendFeedback);
export default router;