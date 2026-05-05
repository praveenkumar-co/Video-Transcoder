import { Router } from 'express';
import { requestPresignedUrl, getVideoStatus, listVideos } from '../controllers/upload.controller';

const router = Router();

router.post('/presigned-url', requestPresignedUrl);
router.get('/videos', listVideos);
router.get('/videos/:videoId', getVideoStatus);

export default router;
