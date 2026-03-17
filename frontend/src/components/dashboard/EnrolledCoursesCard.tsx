'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '@/lib/axios';
import { CourseCard } from '@/components/courses/CourseCard';
import type { ApiResponse, Enrollment } from '@/types';

export function EnrolledCoursesCard() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<ApiResponse<Enrollment[]>>('/user/enrollments')
      .then((res) => setEnrollments(res.data.data))
      .catch(() => setEnrollments([]))
      .finally(() => setIsLoading(false));
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -280 : 280, behavior: 'smooth' });
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-shadow duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-space)' }}>
            My Courses
          </h3>
          <p className="text-sm text-gray-400">Your enrolled courses</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-5 pb-4 [&::-webkit-scrollbar]:hidden">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="min-w-[260px] w-[260px] flex-shrink-0 rounded-2xl border border-border bg-card animate-pulse"
            >
              <div className="aspect-video bg-muted rounded-t-2xl" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-muted rounded w-20" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-8 bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-3 text-center">
          <BookOpen className="w-14 h-14 text-brand/30" />
          <p className="font-semibold text-sm">No courses yet</p>
          <p className="text-xs text-muted-foreground">Start learning something new today</p>
          <Link
            href="/courses"
            className="px-4 py-2 rounded-xl bg-brand text-zinc-900 text-xs font-semibold hover:brightness-110 active:scale-[0.96] transition-all"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="relative">
          {enrollments.length > 2 && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-brand/10 transition-colors shadow-md"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div
            ref={scrollRef}
            className="flex overflow-x-auto gap-5 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {enrollments.map((e) => (
              <div key={e.id} className="min-w-[260px] w-[260px] flex-shrink-0">
                <CourseCard course={e.course} enrollment={e} />
              </div>
            ))}
          </div>
          {enrollments.length > 2 && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-brand/10 transition-colors shadow-md"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
