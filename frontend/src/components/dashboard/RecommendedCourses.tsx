'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import apiClient from '@/lib/axios';
import { getCategoryColor, getCategoryGradient } from '@/lib/utils';
import type { ApiResponse, CoursesResponse, Course, Enrollment } from '@/types';

function CourseThumbnailTiny({ course }: { course: Course }) {
  if (course.thumbnail_url) {
    return (
      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
        <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
      </div>
    );
  }
  const gradient = getCategoryGradient(course.category);
  return (
    <div
      className={`w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}
    >
      <span className="text-sm font-bold text-white/70 select-none">
        {course.title.charAt(0)}
      </span>
    </div>
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
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="h-5 bg-muted rounded w-40 animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (courses.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h3 className="font-semibold" style={{ fontFamily: 'var(--font-space)' }}>
            Recommended for You
          </h3>
          <p className="text-xs text-muted-foreground">Courses you haven&apos;t started yet</p>
        </div>
      </div>
      <div className="space-y-3">
        {courses.map((course) => (
          <div
            key={course.id}
            className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border hover:border-brand/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CourseThumbnailTiny course={course} />
              <div className="min-w-0">
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${getCategoryColor(
                    course.category,
                  )}`}
                >
                  {course.category}
                </span>
                <p className="text-sm font-medium leading-snug truncate">{course.title}</p>
                <p className="text-xs text-muted-foreground">{course.instructor}</p>
              </div>
            </div>
            <button
              onClick={() => handleEnroll(course.id)}
              disabled={enrolling === course.id}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-brand text-zinc-900 text-xs font-semibold hover:bg-brand/90 transition-colors disabled:opacity-50"
            >
              {enrolling === course.id ? '…' : 'Enroll'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
