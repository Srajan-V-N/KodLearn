import { Router } from 'express';
import { getWishlist, addWishlist, removeWishlist } from '../controllers/wishlist.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getWishlist);
router.post('/:courseId', authenticate, addWishlist);
router.delete('/:courseId', authenticate, removeWishlist);

export default router;
