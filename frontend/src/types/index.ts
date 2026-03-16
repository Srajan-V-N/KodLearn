export interface User {
  uid: string;
  username: string;
  email: string;
  role: string;
  isFirstLogin?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  duration_hours: number;
  thumbnail_url?: string;
  is_published: boolean;
  createdAt: string;
  avg_rating?: number | null;
  rating_count?: number;
}

export interface CoursesResponse {
  data: Course[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Review {
  id: string;
  userId: string;
  courseId: string;
  username: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  courseId: string;
  course: Course;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  course: Course;
  progress: number;
  completed: boolean;
  enrolledAt: string;
}

export interface AIProject {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  title: string;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  fileUrl?: string;
  createdAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  section_id: string | null;
  title: string;
  content?: string | null;
  video_url?: string | null;
  youtube_url?: string | null;
  order_num: number;
  duration_seconds: number;
  duration_minutes: number;
  is_published: boolean;
  createdAt: string;
}

export interface LessonWithLock extends Lesson {
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

export interface VideoProgress {
  id: string;
  userId: string;
  lessonId: string;
  last_position_seconds: number;
  is_completed: boolean;
  completed_at: string | null;
  updatedAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  issued_at: string;
  course: Course;
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

export interface UserProfile {
  id: string;
  uid: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}
