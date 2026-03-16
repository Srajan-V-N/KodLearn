import mysql from 'mysql2/promise';
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { pool } from '../config/database';
import { errorResponse } from '../utils/apiResponse';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.kodlearn_token as string | undefined;

    if (!token) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }

    const payload = verifyToken(token);

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM user_tokens WHERE token=? AND userId=? AND expiresAt > NOW() LIMIT 1',
      [token, payload.userId],
    );

    if (!rows[0]) {
      res.status(401).json(errorResponse('Invalid or expired session'));
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json(errorResponse('Invalid token'));
  }
}
