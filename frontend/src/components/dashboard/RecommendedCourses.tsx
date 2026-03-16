'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import apiClient from '@/lib/axios';
import type { ApiResponse, Course, Enrollment } from '@/types';

const categoryColors: Record<string, string> = {
  Programming: 'bg-blue-500/10 text-blue-500',
  'Web Development': 'bg-purple-500/10 text-purple-500',
  'Data Science': 'bg-green-500/10 text-green-500',
  Design: 'bg-pink-500/10 text-pink-500',
};

export function RecommendedCourses() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<ApiResponse<Course[]>>('/courses'),
      apiClient.get<ApiResponse<Enrollment[]>>('/user/enrollments'),
    ])
      .then(([coursesRes, enrollmentsRes]) => {
        const all: Course[] = coursesRes.data.data ?? [];
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
            <div className="min-w-0">
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${
                  categoryColors[course.category] ?? 'bg-brand/10 text-brand'
                }`}
              >
                {course.category}
              </span>
              <p className="text-sm font-medium leading-snug truncate">{course.title}</p>
              <p className="text-xs text-muted-foreground">{course.instructor}</p>
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
