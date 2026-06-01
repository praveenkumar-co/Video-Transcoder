import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getUserVideos,
} from '../controllers/profile.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile', isAuthenticated, getProfile);
router.put('/profile', isAuthenticated, updateProfile);
router.get('/videos', isAuthenticated, getUserVideos);

export default router;  