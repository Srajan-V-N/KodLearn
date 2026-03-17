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
      bgClass: 'bg-muted/50',
      iconClass: 'text-brand',
      numberClass: 'text-brand',
    },
    {
      icon: CheckCircle,
      label: 'Completed',
      value: stats?.completed ?? 0,
      bgClass: 'bg-emerald-500/[0.08]',
      iconClass: 'text-emerald-400',
      numberClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: Clock,
      label: 'Hours Learned',
      value: stats?.hoursLearned ?? 0,
      bgClass: 'bg-sky-500/[0.08]',
      iconClass: 'text-sky-400',
      numberClass: 'text-sky-600 dark:text-sky-400',
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-[3px] transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold" style={{ fontFamily: 'var(--font-space)' }}>
            Learning Stats
          </h3>
          <p className="text-xs text-muted-foreground">Your progress overview</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {items.map(({ icon: Icon, label, value, bgClass, iconClass, numberClass }) => (
          <div
            key={label}
            className={`rounded-xl ${bgClass} p-3 text-center space-y-1 dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-all duration-200`}
          >
            {isLoading ? (
              <div className="animate-pulse h-6 bg-muted rounded mx-auto w-8" />
            ) : (
              <p className={`text-xl font-bold ${numberClass}`} style={{ fontFamily: 'var(--font-space)' }}>
                {value}
              </p>
            )}
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Icon className={`w-3 h-3 ${iconClass}`} />
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
