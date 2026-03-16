'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
    <>
      <PageTransition>
        <div className="space-y-6">
          <WelcomeCard />
          <ContinueLearningCard />
          <EnrolledCoursesCard />
          <LearningStatsCard />
          <RecommendedCourses />
        </div>
      </PageTransition>

      {/* Promptly ChatBot Button — outside PageTransition to avoid transform stacking context */}
      <div className="fixed top-1/2 -translate-y-1/2 z-[9999]" style={{ right: '-26px' }}>
        <motion.button
          onClick={() => router.push('/promptly')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open Jarvis AI assistant"
        >
          <Image
            src="/ChatBot-button.png"
            alt="Jarvis AI"
            width={130}
            height={130}
            priority
          />
        </motion.button>
      </div>
    </>
  );
}