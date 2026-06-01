import { Router } from 'express';
import {
  createFeedback,
  getMyFeedbacks,
  updateFeedback,
  deleteFeedback,
} from '../controllers/feedback.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

// Enforce auth on all feedback routes
router.use(isAuthenticated);

router.post('/', createFeedback);
router.get('/my-feedback', getMyFeedbacks);
router.put('/:feedbackId', updateFeedback);
router.delete('/:feedbackId', deleteFeedback);

export default router;
