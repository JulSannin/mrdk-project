import { Router } from 'express';
import { getReminders, getReminder, createReminder, updateReminder, deleteReminder } from '../controllers/reminders.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validateIdParam } from '../middleware/validateId.js';
import { createImageUpload } from '../config/multer.js';
import { verifyFileType, IMAGE_MIMES } from '../middleware/verifyFileType.js';
import { createReminderValidator, updateReminderValidator } from '../validators/reminders.js';

const router = Router();
const upload = createImageUpload('uploads/reminders');

router.get('/', getReminders);
router.get('/:id', validateIdParam, getReminder);
router.post('/', authenticateToken, requireAdmin, upload.single('image'), verifyFileType(IMAGE_MIMES), createReminderValidator, createReminder);
router.patch('/:id', authenticateToken, requireAdmin, validateIdParam, upload.single('image'), verifyFileType(IMAGE_MIMES), updateReminderValidator, updateReminder);
router.delete('/:id', authenticateToken, requireAdmin, validateIdParam, deleteReminder);
export default router;
