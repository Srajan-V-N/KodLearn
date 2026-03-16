'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, Clock } from 'lucide-react';
import apiClient from '@/lib/axios';
import type { ApiResponse, Enrollment } from '@/types';

export function EnrolledCoursesCard() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<ApiResponse<Enrollment[]>>('/user/enrollments')
      .then((res) => setEnrollments(res.data.data))
      .catch(() => setEnrollments([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h3 className="font-semibold" style={{ fontFamily: 'var(--font-space)' }}>
            My Courses
          </h3>
          <p className="text-xs text-muted-foreground">Your enrolled courses</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-muted-foreground text-sm">
            You haven&apos;t enrolled in any courses yet.
          </p>
          <Link
            href="/#courses"
            className="inline-flex items-center gap-1 text-brand text-sm font-medium hover:underline"
          >
            Browse courses <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((e) => (
            <div key={e.id} className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{e.course.title}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {Math.round(e.progress)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all"
                  style={{ width: `${e.progress}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{e.course.duration_hours}h</span>
                <span className="mx-1">·</span>
                <span>{e.course.instructor}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
