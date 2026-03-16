import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import type { Course } from './course.service';

export interface WishlistItem {
  id: string;
  userId: string;
  courseId: string;
  createdAt: string;
  course: Course;
}

export async function addToWishlist(userId: string, courseId: string): Promise<void> {
  const id = uuidv4();
  await pool.execute(
    'INSERT IGNORE INTO wishlist (id, userId, courseId) VALUES (?, ?, ?)',
    [id, userId, courseId],
  );
}

export async function removeFromWishlist(userId: string, courseId: string): Promise<void> {
  await pool.execute(
    'DELETE FROM wishlist WHERE userId = ? AND courseId = ?',
    [userId, courseId],
  );
}

export async function getUserWishlist(userId: string): Promise<WishlistItem[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT w.id, w.userId, w.courseId, w.createdAt,
            c.title, c.description, c.instructor, c.category,
            c.duration_hours, c.thumbnail_url, c.is_published, c.createdAt AS courseCreatedAt
     FROM wishlist w
     JOIN courses c ON c.id = w.courseId
     WHERE w.userId = ?
     ORDER BY w.createdAt DESC`,
    [userId],
  );
  return (rows as mysql.RowDataPacket[]).map((row) => ({
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    createdAt: row.createdAt,
    course: {
      id: row.courseId,
      title: row.title,
      description: row.description,
      instructor: row.instructor,
      category: row.category,
      duration_hours: parseFloat(row.duration_hours),
      thumbnail_url: row.thumbnail_url ?? null,
      is_published: Boolean(row.is_published),
      createdAt: row.courseCreatedAt,
    },
  }));
}

export async function isInWishlist(userId: string, courseId: string): Promise<boolean> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM wishlist WHERE userId = ? AND courseId = ? LIMIT 1',
    [userId, courseId],
  );
  return (rows as mysql.RowDataPacket[]).length > 0;
}
