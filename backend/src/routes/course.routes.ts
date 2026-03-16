import { Router } from 'express';
import { listCourses, getCourse, enroll } from '../controllers/course.controller';
import { authenticate } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';

const router = Router();

router.get('/', listCourses);
router.get('/:id', optionalAuth, getCourse);
router.post('/:id/enroll', authenticate, enroll);

export default router;
