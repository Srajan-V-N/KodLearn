import mysql from 'mysql2/promise';
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { pool } from '../config/database';

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.kodlearn_token as string | undefined;
    if (!token) return next();

    const payload = verifyToken(token);

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM user_tokens WHERE token=? AND userId=? AND expiresAt > NOW() LIMIT 1',
      [token, payload.userId],
    );

    if (rows[0]) {
      req.user = payload;
    }
  } catch {
    // Invalid token — just skip auth, continue as guest
  }
  next();
}
