import { Request, Response, NextFunction } from 'express';
import {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
} from '../services/wishlist.service';
import { successResponse } from '../utils/apiResponse';

export async function getWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const wishlist = await getUserWishlist(userId);
    res.status(200).json(successResponse('Wishlist retrieved', wishlist));
  } catch (err) {
    next(err);
  }
}

export async function addWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    await addToWishlist(userId, req.params.courseId);
    res.status(200).json(successResponse('Added to wishlist', null));
  } catch (err) {
    next(err);
  }
}

export async function removeWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    await removeFromWishlist(userId, req.params.courseId);
    res.status(200).json(successResponse('Removed from wishlist', null));
  } catch (err) {
    next(err);
  }
}
