'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
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

  if (!data) return null;

  const minutes = Math.floor(data.last_position_seconds / 60);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl p-7 sm:p-8 shadow-[0_6px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-[3px] transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {data.thumbnail_url ? (
            <div className="relative w-36 h-28 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src={data.thumbnail_url}
                alt={data.courseTitle}
                fill
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
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
              <p className="text-xs text-muted-foreground">{minutes}m watched</p>
            )}
          </div>
        </div>
        <button
          onClick={() => router.push(`/learn/${data.courseId}/${data.lessonId}`)}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-zinc-900 text-sm font-semibold hover:brightness-110 active:scale-[0.96] transition-all shadow-lg"
        >
          <PlayCircle className="w-4 h-4" />
          Resume
        </button>
      </div>
    </motion.div>
  );
}
