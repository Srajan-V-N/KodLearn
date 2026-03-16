'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, ArrowRight } from 'lucide-react';
import apiClient from '@/lib/axios';
import type { ApiResponse, ContinueLearning } from '@/types';

export function ContinueLearningCard() {
  const router = useRouter();
  const [data, setData] = useState<ContinueLearning | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<ApiResponse<ContinueLearning | null>>('/user/continue-learning')
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse h-24 rounded-2xl bg-muted" />;
  }

  if (!data) {
    return (
      <div className="glass-card rounded-2xl p-6 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold text-sm" style={{ fontFamily: 'var(--font-space)' }}>
            Start your learning journey
          </p>
          <p className="text-xs text-muted-foreground">
            Enroll in a course and start watching today.
          </p>
        </div>
        <button
          onClick={() => router.push('/courses')}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-zinc-900 text-xs font-semibold hover:bg-brand/90 transition-colors"
        >
          Browse Courses
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  const minutes = Math.floor(data.last_position_seconds / 60);

  return (
    <div className="glass-card rounded-2xl p-6 border-l-4 border-l-brand">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Continue Learning
          </p>
          <p className="font-bold leading-snug truncate" style={{ fontFamily: 'var(--font-space)' }}>
            {data.courseTitle}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {data.sectionTitle && `${data.sectionTitle} · `}
            {data.lessonTitle}
          </p>
          {minutes > 0 && (
            <p className="text-xs text-brand">{minutes}m watched</p>
          )}
        </div>
        <button
          onClick={() => router.push(`/learn/${data.courseId}/${data.lessonId}`)}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-zinc-900 text-xs font-semibold hover:bg-brand/90 transition-colors"
        >
          <PlayCircle className="w-4 h-4" />
          Resume
        </button>
      </div>
    </div>
  );
}
