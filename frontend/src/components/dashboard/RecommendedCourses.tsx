'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '@/lib/axios';
import { CourseCard } from '@/components/courses/CourseCard';
import type { ApiResponse, CoursesResponse, Course, Enrollment } from '@/types';

export function RecommendedCourses() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
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
        setCourses(all.filter((c) => !enrolled.has(c.id)));
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

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
          <div className="h-5 bg-muted rounded w-40 animate-pulse" />
        </div>
        <div className="flex overflow-x-auto gap-5 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[300px] w-[300px] flex-shrink-0 rounded-2xl border border-border bg-card animate-pulse">
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
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-space)' }}>
            Recommended for You
          </h3>
          <p className="text-sm text-gray-400">Courses you haven&apos;t started yet</p>
        </div>
      </div>
      <div className="relative">
        {courses.length > 2 && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors shadow-md"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-5 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {courses.map((course) => (
            <div
              key={course.id}
              className="min-w-[300px] w-[300px] flex-shrink-0"
              style={{ scrollSnapAlign: 'start' }}
            >
              <CourseCard
                course={course}
                onEnroll={handleEnroll}
                enrolling={enrolling === course.id}
              />
            </div>
          ))}
        </div>
        {courses.length > 2 && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors shadow-md"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
