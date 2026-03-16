import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface Review {
  id: string;
  userId: string;
  courseId: string;
  username: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export async function submitReview(
  userId: string,
  courseId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError('Rating must be an integer between 1 and 5', 400);
  }

  // Check enrollment
  const [enrolled] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM enrollments WHERE userId = ? AND courseId = ? LIMIT 1',
    [userId, courseId],
  );
  if (!(enrolled as mysql.RowDataPacket[])[0]) {
    throw new AppError('You must be enrolled to review this course', 403);
  }

  // Upsert
  const [existing] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM course_reviews WHERE userId = ? AND courseId = ? LIMIT 1',
    [userId, courseId],
  );

  const existingRow = (existing as mysql.RowDataPacket[])[0];
  const id = existingRow?.id ?? uuidv4();
  const now = new Date();

  if (existingRow) {
    await pool.execute(
      'UPDATE course_reviews SET rating = ?, comment = ?, createdAt = ? WHERE id = ?',
      [rating, comment ?? null, now, id],
    );
  } else {
    await pool.execute(
      'INSERT INTO course_reviews (id, userId, courseId, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, courseId, rating, comment ?? null, now],
    );
  }

  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT r.*, u.username FROM course_reviews r
     JOIN kod_users u ON u.id = r.userId
     WHERE r.id = ? LIMIT 1`,
    [id],
  );
  return mapReviewRow((rows as mysql.RowDataPacket[])[0]);
}

export async function getCourseReviews(courseId: string): Promise<Review[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT r.*, u.username FROM course_reviews r
     JOIN kod_users u ON u.id = r.userId
     WHERE r.courseId = ?
     ORDER BY r.createdAt DESC`,
    [courseId],
  );
  return (rows as mysql.RowDataPacket[]).map(mapReviewRow);
}

export async function getUserReview(
  userId: string,
  courseId: string,
): Promise<Review | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT r.*, u.username FROM course_reviews r
     JOIN kod_users u ON u.id = r.userId
     WHERE r.userId = ? AND r.courseId = ? LIMIT 1`,
    [userId, courseId],
  );
  const row = (rows as mysql.RowDataPacket[])[0];
  return row ? mapReviewRow(row) : null;
}

function mapReviewRow(row: mysql.RowDataPacket): Review {
  return {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    username: row.username,
    rating: Number(row.rating),
    comment: row.comment ?? null,
    createdAt: row.createdAt,
  };
}
