import { Router } from 'express';
import { requestPresignedUrl, getVideoStatus, listVideos, deleteVideo, getVideoDownloadUrl } from '../controllers/upload.controller';

const router = Router();

router.post('/presigned-url', requestPresignedUrl);
router.get('/videos', listVideos);
router.get('/videos/:videoId', getVideoStatus);
router.get('/videos/:videoId/download-url', getVideoDownloadUrl);
router.delete('/videos/:videoId', deleteVideo);

export default router;
