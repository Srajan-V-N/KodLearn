'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
          <p className="text-xl font-semibold" style={{ fontFamily: 'var(--font-space)' }}>
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
    <div className="glass-card rounded-2xl p-6 border-2 border-brand/30 bg-brand/5 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {data.thumbnail_url ? (
            <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={data.thumbnail_url}
                alt={data.courseTitle}
                fill
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Continue Learning
            </p>
            <p className="text-lg font-bold leading-snug truncate" style={{ fontFamily: 'var(--font-space)' }}>
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
        </div>
        <button
          onClick={() => router.push(`/learn/${data.courseId}/${data.lessonId}`)}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-zinc-900 text-sm font-semibold hover:bg-brand/90 active:scale-95 transition-all"
        >
          <PlayCircle className="w-4 h-4" />
          Resume
        </button>
      </div>
    </div>
  );
}
