'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, CheckCircle, Clock, BookMarked } from 'lucide-react';
import apiClient from '@/lib/axios';
import type { ApiResponse, Enrollment } from '@/types';

interface Stats {
  enrolled: number;
  completed: number;
  hoursLearned: number;
}

export function LearningStatsCard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<ApiResponse<Enrollment[]>>('/user/enrollments')
      .then((res) => {
        const enrollments = res.data.data;
        const completed = enrollments.filter((e) => e.completed).length;
        const hoursLearned = enrollments.reduce((acc, e) => {
          return acc + (e.course.duration_hours * e.progress) / 100;
        }, 0);
        setStats({
          enrolled: enrollments.length,
          completed,
          hoursLearned: Math.round(hoursLearned * 10) / 10,
        });
      })
      .catch(() => setStats({ enrolled: 0, completed: 0, hoursLearned: 0 }))
      .finally(() => setIsLoading(false));
  }, []);

  const items = [
    {
      icon: BookMarked,
      label: 'Enrolled',
      value: stats?.enrolled ?? 0,
    },
    {
      icon: CheckCircle,
      label: 'Completed',
      value: stats?.completed ?? 0,
    },
    {
      icon: Clock,
      label: 'Hours Learned',
      value: stats?.hoursLearned ?? 0,
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h3 className="font-semibold" style={{ fontFamily: 'var(--font-space)' }}>
            Learning Stats
          </h3>
          <p className="text-xs text-muted-foreground">Your progress overview</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl bg-brand/10 p-3 text-center space-y-1"
          >
            {isLoading ? (
              <div className="animate-pulse h-6 bg-muted rounded mx-auto w-8" />
            ) : (
              <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
                {value}
              </p>
            )}
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
