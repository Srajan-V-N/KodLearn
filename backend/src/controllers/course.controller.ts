import { Request, Response, NextFunction } from 'express';
import {
  getCourses,
  getCourseWithCurriculum,
  enrollUser,
  getUserEnrollments,
  updateProgress,
} from '../services/course.service';
import { successResponse } from '../utils/apiResponse';

export async function listCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const courses = await getCourses();
    res.status(200).json(successResponse('Courses retrieved', courses));
  } catch (err) {
    next(err);
  }
}

export async function getCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    const course = await getCourseWithCurriculum(req.params.id, userId);
    res.status(200).json(successResponse('Course retrieved', course));
  } catch (err) {
    next(err);
  }
}

export async function enroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const enrollment = await enrollUser(userId, req.params.id);
    res.status(201).json(successResponse('Enrolled successfully', enrollment));
  } catch (err) {
    next(err);
  }
}

export async function getEnrollments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const enrollments = await getUserEnrollments(userId);
    res.status(200).json(successResponse('Enrollments retrieved', enrollments));
  } catch (err) {
    next(err);
  }
}

export async function patchProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const progress = Number(req.body.progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      res.status(400).json({ success: false, message: 'progress must be 0–100' });
      return;
    }
    const enrollment = await updateProgress(req.params.id, userId, progress);
    res.status(200).json(successResponse('Progress updated', enrollment));
  } catch (err) {
    next(err);
  }
}
