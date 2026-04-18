import { Router } from 'express';
import { requestPresignedUrl, getVideoStatus } from '../controllers/upload.controller';

const router = Router();

router.post('/presigned-url', requestPresignedUrl);
router.get('/videos/:videoId', getVideoStatus);

export default router;