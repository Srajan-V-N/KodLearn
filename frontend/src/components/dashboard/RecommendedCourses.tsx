'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BookOpen, Star, User, Clock } from 'lucide-react';
import apiClient from '@/lib/axios';
import { getCategoryColor, getCategoryGradient, renderStars } from '@/lib/utils';
import type { ApiResponse, CoursesResponse, Course, Enrollment } from '@/types';

function CourseThumbnailFull({ course }: { course: Course }) {
  if (course.thumbnail_url) {
    return (
      <div className="relative w-full aspect-video overflow-hidden">
        <Image
          src={course.thumbnail_url}
          alt={course.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
    );
  }
  const gradient = getCategoryGradient(course.category);
  return (
    <div
      className={`w-full aspect-video bg-gradient-to-br ${gradient} flex items-center justify-center`}
    >
      <span className="text-4xl font-bold text-white/70 select-none">
        {course.title.charAt(0)}
      </span>
    </div>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const { full, half, empty } = renderStars(rating);
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className="flex">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        ))}
        {half && (
          <span className="relative w-3 h-3">
            <Star className="w-3 h-3 text-yellow-400 absolute" />
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 absolute" style={{ clipPath: 'inset(0 50% 0 0)' }} />
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className="w-3 h-3 text-muted-foreground" />
        ))}
      </span>
      <span className="text-muted-foreground">{rating.toFixed(1)} ({count})</span>
    </span>
  );
}

export function RecommendedCourses() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<ApiResponse<CoursesResponse>>('/courses'),
      apiClient.get<ApiResponse<Enrollment[]>>('/user/enrollments'),
    ])
      .then(([coursesRes, enrollmentsRes]) => {
        const all: Course[] = coursesRes.data.data?.data ?? [];
        const enrolled = new Set((enrollmentsRes.data.data ?? []).map((e) => e.courseId));
        setCourses(all.filter((c) => !enrolled.has(c.id)).slice(0, 3));
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const handleEnroll = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      await apiClient.post(`/courses/${courseId}/enroll`);
      router.push(`/courses/${courseId}`);
    } catch {
      // handled by interceptor
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
          <div className="h-5 bg-muted rounded w-40 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card animate-pulse">
              <div className="aspect-video bg-muted" />
              <div className="p-5 space-y-2">
                <div className="h-3 bg-muted rounded w-20" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-8 bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (courses.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-space)' }}>
            Recommended for You
          </h3>
          <p className="text-xs text-muted-foreground">Courses you haven&apos;t started yet</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="group rounded-2xl border border-border bg-card hover:border-brand/40 hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 flex flex-col overflow-hidden"
          >
            <CourseThumbnailFull course={course} />
            <div className="p-5 space-y-3 flex flex-col flex-1">
              <div className="space-y-1.5 flex-1">
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryColor(
                    course.category,
                  )}`}
                >
                  {course.category}
                </span>
                <p className="font-semibold text-sm leading-snug">{course.title}</p>
                {course.avg_rating != null && course.rating_count! > 0 && (
                  <StarRating rating={course.avg_rating} count={course.rating_count!} />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-2">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {course.instructor}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {course.duration_hours}h
                </span>
              </div>
              <button
                onClick={() => handleEnroll(course.id)}
                disabled={enrolling === course.id}
                className="w-full px-3 py-2 rounded-lg bg-brand text-zinc-900 text-xs font-semibold hover:bg-brand/90 active:scale-95 transition-all disabled:opacity-50"
              >
                {enrolling === course.id ? 'Enrolling…' : 'Enroll'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
