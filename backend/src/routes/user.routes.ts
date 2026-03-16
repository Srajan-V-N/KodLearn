import { Router } from 'express';
import {
  balance,
  getContinueLearningHandler,
  getCertificatesHandler,
  getProfileHandler,
} from '../controllers/user.controller';
import { getEnrollments, patchProgress } from '../controllers/course.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/balance', authenticate, balance);
router.get('/enrollments', authenticate, getEnrollments);
router.put('/enrollments/:id/progress', authenticate, patchProgress);
router.get('/continue-learning', authenticate, getContinueLearningHandler);
router.get('/certificates', authenticate, getCertificatesHandler);
router.get('/profile', authenticate, getProfileHandler);

export default router;
