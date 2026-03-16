import { Request, Response, NextFunction } from 'express';
import { getCourseReviews, submitReview, getUserReview } from '../services/review.service';
import { successResponse } from '../utils/apiResponse';

export async function listReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reviews = await getCourseReviews(req.params.id);
    // Also include user's own review if authenticated
    const userId = req.user?.userId;
    let userReview = null;
    if (userId) {
      userReview = await getUserReview(userId, req.params.id);
    }
    res.status(200).json(successResponse('Reviews retrieved', { reviews, userReview }));
  } catch (err) {
    next(err);
  }
}

export async function postReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { rating, comment } = req.body;
    const review = await submitReview(userId, req.params.id, Number(rating), comment);
    res.status(200).json(successResponse('Review submitted', review));
  } catch (err) {
    next(err);
  }
}
