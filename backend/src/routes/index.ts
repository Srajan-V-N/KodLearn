import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import aiRoutes from './ai.routes';
import courseRoutes from './course.routes';
import lessonRoutes from './lesson.routes';
import wishlistRoutes from './wishlist.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/ai', aiRoutes);
router.use('/courses', courseRoutes);
router.use('/lessons', lessonRoutes);
router.use('/wishlist', wishlistRoutes);

export default router;
