import { Router } from 'express';
import { handleS3Event } from '../webhooks/s3.webhook';
const router = Router();

router.post('/s3', handleS3Event);

export default router;