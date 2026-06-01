import { Router } from 'express';
import {
  signup,
  login,
  googleAuth,
  signout,
  checkUsername,
} from '../controllers/auth.controller';


const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/signout', signout);
router.post('/check-username', checkUsername);


export default router;
