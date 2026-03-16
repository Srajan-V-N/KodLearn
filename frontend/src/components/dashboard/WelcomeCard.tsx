'use client';

import { useAuthStore } from '@/stores/authStore';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeCard() {
  const { user } = useAuthStore();

  return (
    <div className="glass-card rounded-2xl p-6 border-l-4 border-l-brand">
      <p className="text-muted-foreground text-sm">{getGreeting()},</p>
      <h2 className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-space)' }}>
        {user?.username ?? 'User'}
      </h2>
      <p className="text-muted-foreground text-sm mt-2">
        {user?.isFirstLogin
          ? 'Welcome to KodLearn'
          : 'Welcome back'}
      </p>
    </div>
  );
}
