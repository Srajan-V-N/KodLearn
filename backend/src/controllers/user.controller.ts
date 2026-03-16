import { Request, Response, NextFunction } from 'express';
import { getBalance } from '../services/user.service';
import { getContinueLearning, getUserCertificates, getUserProfile } from '../services/course.service';
import { successResponse } from '../utils/apiResponse';

export async function balance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const amount = await getBalance(userId);
    res
      .status(200)
      .json(successResponse('Balance retrieved', { balance: amount, currency: 'INR' }));
  } catch (err) {
    next(err);
  }
}

export async function getContinueLearningHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = await getContinueLearning(userId);
    res.status(200).json(successResponse('Continue learning retrieved', data));
  } catch (err) {
    next(err);
  }
}

export async function getCertificatesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const certificates = await getUserCertificates(userId);
    res.status(200).json(successResponse('Certificates retrieved', certificates));
  } catch (err) {
    next(err);
  }
}

export async function getProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const profile = await getUserProfile(userId);
    res.status(200).json(successResponse('Profile retrieved', profile));
  } catch (err) {
    next(err);
  }
}
