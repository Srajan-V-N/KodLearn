import { Router } from 'express';
import { listCourses, getCourse, enroll } from '../controllers/course.controller';
import { listReviews, postReview } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';

const router = Router();

router.get('/', listCourses);
router.get('/:id', optionalAuth, getCourse);
router.post('/:id/enroll', authenticate, enroll);
router.get('/:id/reviews', optionalAuth, listReviews);
router.post('/:id/reviews', authenticate, postReview);

export default router;
