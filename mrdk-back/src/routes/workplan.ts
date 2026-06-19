import { Router } from 'express';
import { getWorkplan, downloadWorkplan, createWorkplan, updateWorkplan, deleteWorkplan } from '../controllers/workplan.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validateIdParam } from '../middleware/validateId.js';
import { createDocumentUpload } from '../config/multer.js';
import { verifyFileType, DOCUMENT_MIMES } from '../middleware/verifyFileType.js';
import { createWorkplanValidator, updateWorkplanValidator } from '../validators/workplan.js';

const router = Router();
const upload = createDocumentUpload('uploads/workplan');

router.get('/', getWorkplan);
router.get('/:id', validateIdParam, downloadWorkplan);
router.post('/', authenticateToken, requireAdmin, upload.single('document'), verifyFileType(DOCUMENT_MIMES), createWorkplanValidator, createWorkplan);
router.patch('/:id', authenticateToken, requireAdmin, validateIdParam, upload.single('document'), verifyFileType(DOCUMENT_MIMES), updateWorkplanValidator, updateWorkplan);
router.delete('/:id', authenticateToken, requireAdmin, validateIdParam, deleteWorkplan);
export default router;
