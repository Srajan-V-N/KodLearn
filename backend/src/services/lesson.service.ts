import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface Lesson {
  id: string;
  courseId: string;
  section_id: string | null;
  title: string;
  content: string | null;
  video_url: string | null;
  youtube_url: string | null;
  order_num: number;
  duration_seconds: number;
  duration_minutes: number;
  is_published: boolean;
  createdAt: string;
}

export interface VideoProgress {
  id: string;
  userId: string;
  lessonId: string;
  last_position_seconds: number;
  is_completed: boolean;
  completed_at: string | null;
  updatedAt: string;
}

export async function getLessonById(lessonId: string): Promise<Lesson> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM lessons WHERE id = ? LIMIT 1',
    [lessonId],
  );
  const lesson = rows[0] as Lesson | undefined;
  if (!lesson) throw new AppError('Lesson not found', 404);
  return {
    ...lesson,
    duration_seconds: lesson.duration_seconds ?? 0,
    duration_minutes: lesson.duration_minutes ?? 0,
    is_published: Boolean(lesson.is_published),
  };
}

export async function getVideoProgress(
  userId: string,
  lessonId: string,
): Promise<VideoProgress | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM video_progress WHERE userId = ? AND lessonId = ? LIMIT 1',
    [userId, lessonId],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.userId,
    lessonId: row.lessonId,
    last_position_seconds: row.last_position_seconds ?? 0,
    is_completed: Boolean(row.is_completed),
    completed_at: row.completed_at ?? null,
    updatedAt: row.updatedAt,
  };
}

export async function upsertVideoProgress(
  userId: string,
  lessonId: string,
  positionSeconds: number,
  isCompleted: boolean,
): Promise<void> {
  const id = uuidv4();
  const now = new Date();
  const completedAt = isCompleted ? now : null;

  // Check prior completion state
  const [existing] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT is_completed FROM video_progress WHERE userId = ? AND lessonId = ? LIMIT 1',
    [userId, lessonId],
  );
  const wasCompleted = existing[0] ? Boolean(existing[0].is_completed) : false;

  await pool.execute(
    `INSERT INTO video_progress (id, userId, lessonId, last_position_seconds, is_completed, completed_at, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       last_position_seconds = VALUES(last_position_seconds),
       is_completed = VALUES(is_completed),
       completed_at = IF(VALUES(is_completed) AND completed_at IS NULL, VALUES(completed_at), completed_at),
       updatedAt = VALUES(updatedAt)`,
    [id, userId, lessonId, positionSeconds, isCompleted, completedAt, now],
  );

  // If newly completed, recalculate enrollment progress
  if (isCompleted && !wasCompleted) {
    const [lessonRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT courseId FROM lessons WHERE id = ? LIMIT 1',
      [lessonId],
    );
    const courseId = lessonRows[0]?.courseId;
    if (!courseId) return;

    const [enrollRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM enrollments WHERE userId = ? AND courseId = ? LIMIT 1',
      [userId, courseId],
    );
    const enrollmentId = enrollRows[0]?.id;
    if (!enrollmentId) return;

    const [totalRows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM lessons WHERE courseId = ? AND is_published = true',
      [courseId],
    );
    const total = Number(totalRows[0]?.total ?? 0);

    const [completedRows] = await pool.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS completed FROM video_progress vp
       JOIN lessons l ON l.id = vp.lessonId
       WHERE vp.userId = ? AND l.courseId = ? AND vp.is_completed = true`,
      [userId, courseId],
    );
    const completed = Number(completedRows[0]?.completed ?? 0);

    const progress = total > 0 ? Math.min(100, (completed / total) * 100) : 0;
    const isFullyCompleted = progress >= 100;
    const completedAtDate = isFullyCompleted ? now : null;

    await pool.execute(
      `UPDATE enrollments SET progress = ?, completed = ?, completedAt = ? WHERE id = ?`,
      [progress, isFullyCompleted, completedAtDate, enrollmentId],
    );

    if (isFullyCompleted) {
      await pool.execute(
        `INSERT IGNORE INTO certificates (id, userId, courseId, issued_at) VALUES (?, ?, ?, ?)`,
        [uuidv4(), userId, courseId, now],
      );
    }
  }
}
