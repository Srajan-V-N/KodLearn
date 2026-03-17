'use client';

import { useEffect, useState } from 'react';
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
    <div className="glass-card rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-[3px] transition-all duration-300 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-brand/[0.04] to-transparent pointer-events-none" />
      <div className="relative">
        <p className="text-muted-foreground text-sm">{getGreeting()},</p>
        <h2 className="text-3xl font-bold mt-1" style={{ fontFamily: 'var(--font-space)' }}>
          {user?.username ?? 'User'}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {user?.isFirstLogin
            ? 'Welcome to KodLearn'
            : 'Continue your learning journey'}
        </p>
        {completed !== null && completed > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            You&apos;ve completed {completed} course{completed === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </div>
  );
}
