'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/lib/axios';
import type { ApiResponse, Enrollment } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeCard() {
  const { user } = useAuthStore();
  const [completed, setCompleted] = useState<number | null>(null);

  useEffect(() => {
    apiClient
      .get<ApiResponse<Enrollment[]>>('/user/enrollments')
      .then((res) => {
        const count = res.data.data.filter((e) => e.completed).length;
        setCompleted(count);
      })
      .catch(() => setCompleted(0));
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 dark:shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-[2px] transition-all duration-300 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.05] to-transparent pointer-events-none" />
      <div className="relative flex items-center gap-6">
        {/* Left: text content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{getGreeting()},</p>
          <h2 className="text-3xl font-bold truncate" style={{ fontFamily: 'var(--font-space)' }}>
            {user?.username ?? 'User'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {user?.isFirstLogin ? 'Welcome to KodLearn' : 'Continue your learning journey'}
          </p>
          {completed !== null && completed > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-brand/10 text-brand mt-1">
              <BookOpen className="w-3 h-3" />
              {completed} course{completed === 1 ? '' : 's'} completed
            </span>
          )}
        </div>

        {/* Right: action */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-brand" />
          </div>
          <Link
            href="/courses"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-zinc-900 text-xs font-semibold hover:brightness-110 active:scale-[0.96] transition-all whitespace-nowrap"
          >
            Browse Courses
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
