import { Router } from 'express';
import { requestPresignedUrl, getVideoStatus, triggerTranscode } from '../controllers/upload.controller';

const router = Router();

router.post('/presigned-url', requestPresignedUrl);
router.get('/videos/:videoId', getVideoStatus);
router.post('/videos/:videoId/transcode', triggerTranscode);

export default router;