import { Router } from 'express';
import {
  transcodeVideo,
  compressVideo,
  convertVideo,
  extractAudio,
  trimVideo,
  downloadFromUrl,
  getJobStatus,
  generateThumbnail,
  streamJobProgress,
} from '../controllers/process.controller';

const router = Router();

router.post('/transcode',     transcodeVideo);
router.post('/compress',      compressVideo);
router.post('/convert',       convertVideo);
router.post('/extract-audio', extractAudio);
router.post('/trim',          trimVideo);
router.post('/download-url',  downloadFromUrl);
router.post('/thumbnail',     generateThumbnail);
router.get('/status/:videoId/live', streamJobProgress);
router.get('/job/:videoId',   getJobStatus);

export default router;
