import { Router } from 'express';
import { getLesson, getLessonProgress, saveLessonProgress } from '../controllers/lesson.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { videoProgressSchema } from '../schemas/lesson.schema';

const router = Router();

router.get('/:id', getLesson);
router.get('/:id/progress', authenticate, getLessonProgress);
router.post('/:id/progress', authenticate, validate(videoProgressSchema), saveLessonProgress);

export default router;
