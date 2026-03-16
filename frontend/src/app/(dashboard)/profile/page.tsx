'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageTransition } from '@/components/common/PageTransition';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/lib/axios';
import type { Enrollment, UserProfile } from '@/types';

export default function ProfilePage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;
    Promise.all([apiClient.get('/user/profile'), apiClient.get('/user/enrollments')])
      .then(([profileRes, enrollRes]) => {
        setProfile(profileRes.data.data);
        setEnrollments(enrollRes.data.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [_hasHydrated, isAuthenticated]);

  if (!_hasHydrated || !isAuthenticated) return null;

  const completedCount = enrollments.filter((e) => e.completed).length;
  const totalHours = enrollments.reduce((sum, e) => sum + (e.course.duration_hours ?? 0), 0);

  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : '??';

  return (
    <PageTransition>
      <div className="space-y-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
          Profile
        </h1>

        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse h-32 rounded-2xl bg-muted" />
            <div className="animate-pulse h-24 rounded-2xl bg-muted" />
          </div>
        ) : (
          <>
            {/* Avatar & Info */}
            <div className="glass-card rounded-2xl p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-brand">{initials}</span>
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <div>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
                    {profile?.username}
                  </h2>
                  <p className="text-muted-foreground text-sm">{profile?.email}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                    {profile?.role}
                  </span>
                  {profile?.createdAt && (
                    <span className="text-xs text-muted-foreground pt-0.5">
                      Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Enrolled', value: enrollments.length },
                { label: 'Completed', value: completedCount },
                { label: 'Total Hours', value: `${totalHours.toFixed(0)}h` },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-2xl p-5 text-center">
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Course list */}
            {enrollments.length > 0 && (
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold" style={{ fontFamily: 'var(--font-space)' }}>
                  My Courses
                </h3>
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
