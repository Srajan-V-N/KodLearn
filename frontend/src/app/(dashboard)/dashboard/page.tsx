'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { EnrolledCoursesCard } from '@/components/dashboard/EnrolledCoursesCard';
import { LearningStatsCard } from '@/components/dashboard/LearningStatsCard';
import { ContinueLearningCard } from '@/components/dashboard/ContinueLearning';
import { RecommendedCourses } from '@/components/dashboard/RecommendedCourses';
import { PageTransition } from '@/components/common/PageTransition';

export default function DashboardPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated) return null;
  if (!isAuthenticated) return null;

  return (
    <PageTransition>
      <div className="space-y-8">
        <WelcomeCard />
        <ContinueLearningCard />
        <EnrolledCoursesCard />
        <LearningStatsCard />
        <RecommendedCourses />
      </div>
    </PageTransition>
  );
}