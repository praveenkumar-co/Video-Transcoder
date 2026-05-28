import { Router } from 'express';
import {
  transcodeVideo,
  compressVideo,
  convertVideo,
  extractAudio,
  trimVideo,
  downloadFromUrl,
  getJobStatus,
} from '../controllers/process.controller';

const router = Router();

router.post('/transcode',     transcodeVideo);
router.post('/compress',      compressVideo);
router.post('/convert',       convertVideo);
router.post('/extract-audio', extractAudio);
router.post('/trim',          trimVideo);
router.post('/download-url',  downloadFromUrl);
router.get('/job/:videoId',   getJobStatus);

export default router;
