'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageTransition } from '@/components/common/PageTransition';
import apiClient from '@/lib/axios';
import type { Enrollment, ContinueLearning } from '@/types';

export default function MyLearningPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [continueLearning, setContinueLearning] = useState<ContinueLearning | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;
    Promise.all([
      apiClient.get('/user/enrollments'),
      apiClient.get('/user/continue-learning'),
    ])
      .then(([enrollRes, contRes]) => {
        setEnrollments(enrollRes.data.data ?? []);
        setContinueLearning(contRes.data.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [_hasHydrated, isAuthenticated]);

  if (!_hasHydrated || !isAuthenticated) return null;

  const active = enrollments.filter((e) => e.progress > 0 && !e.completed);
  const notStarted = enrollments.filter((e) => e.progress === 0);
  const completed = enrollments.filter((e) => e.completed);

  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
            My Learning
          </h1>
          <p className="text-muted-foreground mt-1">Track your enrolled courses and progress.</p>
        </div>

        {/* Continue where you left off */}
        {!loading && continueLearning && (
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-brand">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
              Continue Where You Left Off
            </p>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-lg leading-snug" style={{ fontFamily: 'var(--font-space)' }}>
                  {continueLearning.courseTitle}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {continueLearning.sectionTitle && `${continueLearning.sectionTitle} · `}
                  {continueLearning.lessonTitle}
                </p>
              </div>
              <button
                onClick={() =>
                  router.push(`/learn/${continueLearning.courseId}/${continueLearning.lessonId}`)
                }
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-zinc-900 text-sm font-semibold hover:bg-brand/90 transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                Resume
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-24 rounded-2xl bg-muted" />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">You haven&apos;t enrolled in any courses yet.</p>
            <button
              onClick={() => router.push('/courses')}
              className="px-6 py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold text-sm hover:bg-brand/90 transition-colors"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <>
            <CourseSection title="In Progress" courses={active} router={router} />
            <CourseSection title="Not Started" courses={notStarted} router={router} />
            <CourseSection title="Completed" courses={completed} router={router} />
          </>
        )}
      </div>
    </PageTransition>
  );
}

function CourseSection({
  title,
  courses,
  router,
}: {
  title: string;
  courses: Enrollment[];
  router: ReturnType<typeof useRouter>;
}) {
  if (courses.length === 0) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-space)' }}>
        {title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">({courses.length})</span>
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((e) => (
          <div
            key={e.id}
            className="glass-card rounded-2xl p-5 space-y-3 hover:border-brand/40 border border-border transition-colors"
          >
            <div>
              <p className="font-semibold text-sm leading-snug">{e.course.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{e.course.instructor}</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(e.progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-brand h-1.5 rounded-full transition-all"
                  style={{ width: `${e.progress}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => router.push(`/courses/${e.courseId}`)}
              className="w-full text-xs font-medium py-2 rounded-xl border border-brand text-brand hover:bg-brand/10 transition-colors"
            >
              {e.completed ? 'View Course' : e.progress > 0 ? 'Resume' : 'Start'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
