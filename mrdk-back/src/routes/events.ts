import { Router } from 'express';
import { getEvents, getEventYears, getEvent, createEvent, updateEvent, deleteEvent, addEventImages, deleteEventImage, deleteEventMainImage, addEventVideos, deleteEventVideo } from '../controllers/events.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validateIdParam } from '../middleware/validateId.js';
import { createImageUpload, createVideoUpload } from '../config/multer.js';
import { verifyFileType, IMAGE_MIMES, VIDEO_MIMES } from '../middleware/verifyFileType.js';
import { createEventValidator, updateEventValidator, eventIdValidator, eventImageIdValidator, eventVideoIdValidator } from '../validators/events.js';

const router = Router();
const upload = createImageUpload('uploads/events');
const videoUpload = createVideoUpload('uploads/events');

router.get('/', getEvents);
router.get('/years', getEventYears); // до '/:id', иначе 'years' матчится как id
router.get('/:id', validateIdParam, getEvent);
router.post('/', authenticateToken, requireAdmin, upload.single('image'), verifyFileType(IMAGE_MIMES), createEventValidator, createEvent);
router.post('/:id/images', authenticateToken, requireAdmin, upload.array('images', 10), verifyFileType(IMAGE_MIMES), eventIdValidator, addEventImages);
router.delete('/:id/images/:imageId', authenticateToken, requireAdmin, eventImageIdValidator, deleteEventImage);
router.delete('/:id/image', authenticateToken, requireAdmin, validateIdParam, deleteEventMainImage);
router.post('/:id/videos', authenticateToken, requireAdmin, videoUpload.array('videos', 10), verifyFileType(VIDEO_MIMES), eventIdValidator, addEventVideos);
router.delete('/:id/videos/:videoId', authenticateToken, requireAdmin, eventVideoIdValidator, deleteEventVideo);
router.patch('/:id', authenticateToken, requireAdmin, upload.single('image'), verifyFileType(IMAGE_MIMES), eventIdValidator, updateEventValidator, updateEvent);
router.delete('/:id', authenticateToken, requireAdmin, eventIdValidator, deleteEvent);
export default router;
