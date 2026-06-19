import { Router } from 'express';
import { getDocuments, downloadDocument, createDocument, updateDocument, deleteDocument } from '../controllers/documents.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validateIdParam } from '../middleware/validateId.js';
import { createDocumentUpload } from '../config/multer.js';
import { verifyFileType, DOCUMENT_MIMES } from '../middleware/verifyFileType.js';
import { createDocumentValidator, updateDocumentValidator } from '../validators/documents.js';

const router = Router();
const upload = createDocumentUpload('uploads/documents');

router.get('/', getDocuments);
router.get('/:id', validateIdParam, downloadDocument);
router.post('/', authenticateToken, requireAdmin, upload.single('document'), verifyFileType(DOCUMENT_MIMES), createDocumentValidator, createDocument);
router.patch('/:id', authenticateToken, requireAdmin, validateIdParam, upload.single('document'), verifyFileType(DOCUMENT_MIMES), updateDocumentValidator, updateDocument);
router.delete('/:id', authenticateToken, requireAdmin, validateIdParam, deleteDocument);
export default router;
