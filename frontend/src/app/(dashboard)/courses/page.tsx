'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageTransition } from '@/components/common/PageTransition';
import apiClient from '@/lib/axios';
import type { Course, Enrollment } from '@/types';

const categoryColors: Record<string, string> = {
  Programming: 'bg-blue-500/10 text-blue-500',
  'Web Development': 'bg-purple-500/10 text-purple-500',
  'Data Science': 'bg-green-500/10 text-green-500',
  Design: 'bg-pink-500/10 text-pink-500',
};

export default function CoursesPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;

    async function fetchData() {
      try {
        const [coursesRes, enrollmentsRes] = await Promise.all([
          apiClient.get('/courses'),
          apiClient.get('/user/enrollments'),
        ]);
        setCourses(coursesRes.data.data ?? coursesRes.data);
        setEnrollments(enrollmentsRes.data.data ?? enrollmentsRes.data);
      } catch {
        // errors handled by interceptor
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [_hasHydrated, isAuthenticated]);

  if (!_hasHydrated || !isAuthenticated) return null;

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId);
    try {
      const res = await apiClient.post(`/courses/${courseId}/enroll`);
      const newEnrollment: Enrollment = res.data.data ?? res.data;
      setEnrollments((prev) => [...prev, newEnrollment]);
    } catch {
      // errors handled by interceptor
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-space)' }}
          >
            Browse Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore all available courses and start learning today.
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-pulse h-52"
              />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const enrollment = enrollments.find((e) => e.courseId === course.id);
              const isEnrolled = enrolledCourseIds.has(course.id);

              return (
                <div
                  key={course.id}
                  className="rounded-2xl border border-border bg-card p-6 space-y-4 hover:border-brand/40 transition-colors flex flex-col"
                >
                  <div className="space-y-2 flex-1">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        categoryColors[course.category] ?? 'bg-brand/10 text-brand'
                      }`}
                    >
                      {course.category}
                    </span>
                    <h3 className="font-semibold leading-snug">
                      <Link
                        href={`/courses/${course.id}`}
                        className="hover:text-brand transition-colors"
                      >
                        {course.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {course.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {course.instructor}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {course.duration_hours}h
                    </span>
                  </div>

                  {isEnrolled && enrollment ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{Math.round(enrollment.progress)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-brand h-1.5 rounded-full transition-all"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                      <button
                        onClick={() => router.push(`/courses/${course.id}`)}
                        className="w-full text-sm font-medium py-2 rounded-xl border border-brand text-brand hover:bg-brand/10 transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrolling === course.id}
                      className="w-full text-sm font-medium py-2 rounded-xl bg-brand text-white hover:bg-brand/90 transition-colors disabled:opacity-50"
                    >
                      {enrolling === course.id ? 'Enrolling…' : 'Enroll'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
