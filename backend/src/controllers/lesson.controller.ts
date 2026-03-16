import { Request, Response, NextFunction } from 'express';
import { getLessonById, getVideoProgress, upsertVideoProgress } from '../services/lesson.service';
import { successResponse } from '../utils/apiResponse';

export async function getLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lesson = await getLessonById(req.params.id);
    res.status(200).json(successResponse('Lesson retrieved', lesson));
  } catch (err) {
    next(err);
  }
}

export async function getLessonProgress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const progress = await getVideoProgress(userId, req.params.id);
    res.status(200).json(successResponse('Progress retrieved', progress));
  } catch (err) {
    next(err);
  }
}

export async function saveLessonProgress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { last_position_seconds, is_completed } = req.body as {
      last_position_seconds: number;
      is_completed: boolean;
    };
    await upsertVideoProgress(userId, req.params.id, last_position_seconds, is_completed);
    res.status(200).json(successResponse('Progress saved', null));
  } catch (err) {
    next(err);
  }
}
