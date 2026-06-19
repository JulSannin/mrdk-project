import { Router } from 'express';
import { getClubs, getClub, createClub, updateClub, deleteClub } from '../controllers/clubs.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validateIdParam } from '../middleware/validateId.js';
import { createClubValidator, updateClubValidator } from '../validators/clubs.js';

const router = Router();

router.get('/', getClubs);
router.get('/:id', validateIdParam, getClub);
router.post('/', authenticateToken, requireAdmin, createClubValidator, createClub);
router.patch('/:id', authenticateToken, requireAdmin, validateIdParam, updateClubValidator, updateClub);
router.delete('/:id', authenticateToken, requireAdmin, validateIdParam, deleteClub);
export default router;
