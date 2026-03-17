import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  duration_hours: number;
  thumbnail_url: string | null;
  is_published: boolean;
  createdAt: string;
}

export interface LessonWithLock {
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
  is_locked: boolean;
  is_completed: boolean;
}

export interface Section {
  id: string;
  courseId: string;
  title: string;
  order_index: number;
  createdAt: string;
  lessons: LessonWithLock[];
}

export interface CourseWithCurriculum extends Course {
  sections: Section[];
}

export interface ContinueLearning {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  sectionTitle: string;
  last_position_seconds: number;
  thumbnail_url: string | null;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  issued_at: string;
  course: Course;
}

export interface UserProfile {
  id: string;
  uid: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  completed: boolean;
  enrolledAt: string;
  completedAt: string | null;
  course: Course;
}

export interface CourseWithRating extends Course {
  avg_rating: number | null;
  rating_count: number;
}

export interface CoursesPage {
  data: CourseWithRating[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getCourses(opts?: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<CoursesPage> {
  const page = Math.max(1, opts?.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts?.limit ?? 12));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['c.is_published = true'];
  const params: (string | number)[] = [];

  if (opts?.search) {
    conditions.push('(c.title LIKE ? OR c.description LIKE ?)');
    const like = `%${opts.search}%`;
    params.push(like, like);
  }
  if (opts?.category) {
    conditions.push('c.category = ?');
    params.push(opts.category);
  }

  const where = conditions.join(' AND ');

  const [countRows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM courses c WHERE ${where}`,
    params,
  );
  const total = Number((countRows as mysql.RowDataPacket[])[0].cnt);

  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT c.*,
            AVG(r.rating)   AS avg_rating,
            COUNT(r.id)     AS rating_count
     FROM courses c
     LEFT JOIN course_reviews r ON r.courseId = c.id
     WHERE ${where}
     GROUP BY c.id
     ORDER BY c.createdAt DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  const data = (rows as mysql.RowDataPacket[]).map((row) => ({
    ...(row as CourseWithRating),
    avg_rating: row.avg_rating != null ? parseFloat(row.avg_rating) : null,
    rating_count: Number(row.rating_count),
  }));

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getCourseById(id: string): Promise<Course> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM courses WHERE id = ? LIMIT 1',
    [id],
  );
  const course = rows[0] as Course | undefined;
  if (!course) throw new AppError('Course not found', 404);
  return course;
}

export async function enrollUser(userId: string, courseId: string): Promise<Enrollment> {
  // Verify course exists
  await getCourseById(courseId);

  const id = uuidv4();
  try {
    await pool.execute(
      'INSERT INTO enrollments (id, userId, courseId) VALUES (?, ?, ?)',
      [id, userId, courseId],
    );
  } catch (err: unknown) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === 'ER_DUP_ENTRY') {
      throw new AppError('Already enrolled in this course', 409);
    }
    throw err;
  }

  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT e.*, c.title, c.description, c.instructor, c.category,
            c.duration_hours, c.thumbnail_url, c.is_published, c.createdAt as courseCreatedAt
     FROM enrollments e
     JOIN courses c ON c.id = e.courseId
     WHERE e.id = ? LIMIT 1`,
    [id],
  );
  return mapEnrollmentRow(rows[0]);
}

export async function getUserEnrollments(userId: string): Promise<Enrollment[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT e.*, c.title, c.description, c.instructor, c.category,
            c.duration_hours, c.thumbnail_url, c.is_published, c.createdAt as courseCreatedAt
     FROM enrollments e
     JOIN courses c ON c.id = e.courseId
     WHERE e.userId = ?
     ORDER BY e.enrolledAt DESC`,
    [userId],
  );
  return (rows as mysql.RowDataPacket[]).map(mapEnrollmentRow);
}

export async function updateProgress(
  enrollmentId: string,
  userId: string,
  progress: number,
): Promise<Enrollment> {
  const [check] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM enrollments WHERE id = ? AND userId = ? LIMIT 1',
    [enrollmentId, userId],
  );
  if (!(check as mysql.RowDataPacket[])[0]) {
    throw new AppError('Enrollment not found', 404);
  }

  const completed = progress >= 100;
  const completedAt = completed ? new Date() : null;

  await pool.execute(
    `UPDATE enrollments SET progress = ?, completed = ?, completedAt = ? WHERE id = ?`,
    [progress, completed, completedAt, enrollmentId],
  );

  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT e.*, c.title, c.description, c.instructor, c.category,
            c.duration_hours, c.thumbnail_url, c.is_published, c.createdAt as courseCreatedAt
     FROM enrollments e
     JOIN courses c ON c.id = e.courseId
     WHERE e.id = ? LIMIT 1`,
    [enrollmentId],
  );
  return mapEnrollmentRow(rows[0]);
}

function mapEnrollmentRow(row: mysql.RowDataPacket): Enrollment {
  return {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    progress: parseFloat(row.progress),
    completed: Boolean(row.completed),
    enrolledAt: row.enrolledAt,
    completedAt: row.completedAt ?? null,
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
  };
}

export async function getCourseWithCurriculum(
  courseId: string,
  userId?: string,
): Promise<CourseWithCurriculum> {
  const course = await getCourseById(courseId);

  const [sectionRows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM sections WHERE courseId = ? ORDER BY order_index',
    [courseId],
  );

  const [lessonRows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM lessons WHERE courseId = ? AND is_published = true ORDER BY order_num',
    [courseId],
  );

  // Build progress map
  const progressMap = new Map<string, boolean>();
  if (userId) {
    const [progressRows] = await pool.execute<mysql.RowDataPacket[]>(
      `SELECT vp.lessonId, vp.is_completed
       FROM video_progress vp
       JOIN lessons l ON l.id = vp.lessonId
       WHERE vp.userId = ? AND l.courseId = ?`,
      [userId, courseId],
    );
    for (const row of progressRows) {
      progressMap.set(row.lessonId, Boolean(row.is_completed));
    }
  }

  // Build section order map
  const sectionOrderMap = new Map<string, number>();
  for (const s of sectionRows) {
    sectionOrderMap.set(s.id, s.order_index);
  }

  // Sort lessons globally by (section.order_index, lesson.order_num)
  const allLessons = (lessonRows as mysql.RowDataPacket[]).slice().sort((a, b) => {
    const sectionOrderA = sectionOrderMap.get(a.section_id) ?? 999;
    const sectionOrderB = sectionOrderMap.get(b.section_id) ?? 999;
    if (sectionOrderA !== sectionOrderB) return sectionOrderA - sectionOrderB;
    return (a.order_num ?? 0) - (b.order_num ?? 0);
  });

  // Determine lock state
  const lessonsWithLock: LessonWithLock[] = allLessons.map((lesson, i) => {
    const is_completed = progressMap.get(lesson.id) ?? false;
    let is_locked = false;
    if (i > 0) {
      const prevLesson = allLessons[i - 1];
      const prevCompleted = progressMap.get(prevLesson.id) ?? false;
      is_locked = !prevCompleted;
    }
    return {
      id: lesson.id,
      courseId: lesson.courseId,
      section_id: lesson.section_id ?? null,
      title: lesson.title,
      content: lesson.content ?? null,
      video_url: lesson.video_url ?? null,
      youtube_url: lesson.youtube_url ?? null,
      order_num: lesson.order_num ?? 0,
      duration_seconds: lesson.duration_seconds ?? 0,
      duration_minutes: lesson.duration_minutes ?? 0,
      is_published: Boolean(lesson.is_published),
      createdAt: lesson.createdAt,
      is_locked,
      is_completed,
    };
  });

  // Group into sections
  const sections: Section[] = (sectionRows as mysql.RowDataPacket[]).map((s) => ({
    id: s.id,
    courseId: s.courseId,
    title: s.title,
    order_index: s.order_index,
    createdAt: s.createdAt,
    lessons: lessonsWithLock.filter((l) => l.section_id === s.id),
  }));

  return { ...course, sections };
}

export async function getContinueLearning(userId: string): Promise<ContinueLearning | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT
       vp.last_position_seconds,
       l.id AS lessonId, l.title AS lessonTitle,
       COALESCE(s.title, '') AS sectionTitle,
       c.id AS courseId, c.title AS courseTitle, c.thumbnail_url
     FROM video_progress vp
     JOIN lessons l ON l.id = vp.lessonId
     LEFT JOIN sections s ON s.id = l.section_id
     JOIN courses c ON c.id = l.courseId
     JOIN enrollments e ON e.userId = vp.userId AND e.courseId = c.id
     WHERE vp.userId = ?
       AND e.completed = false
     ORDER BY vp.updatedAt DESC
     LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    courseId: row.courseId,
    courseTitle: row.courseTitle,
    lessonId: row.lessonId,
    lessonTitle: row.lessonTitle,
    sectionTitle: row.sectionTitle,
    last_position_seconds: row.last_position_seconds ?? 0,
    thumbnail_url: row.thumbnail_url ?? null,
  };
}

export async function getUserCertificates(userId: string): Promise<Certificate[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT cert.*, c.title, c.description, c.instructor, c.category,
            c.duration_hours, c.thumbnail_url, c.is_published, c.createdAt AS courseCreatedAt
     FROM certificates cert
     JOIN courses c ON c.id = cert.courseId
     WHERE cert.userId = ?
     ORDER BY cert.issued_at DESC`,
    [userId],
  );
  return (rows as mysql.RowDataPacket[]).map((row) => ({
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    issued_at: row.issued_at,
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

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id, uid, username, email, role, createdAt FROM kod_users WHERE id = ? LIMIT 1',
    [userId],
  );
  if (!rows[0]) throw new AppError('User not found', 404);
  return rows[0] as UserProfile;
}
