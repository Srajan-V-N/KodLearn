'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import dynamic from 'next/dynamic';
const YouTubePlayer = dynamic(
  () => import('@/components/learn/YouTubePlayer').then((m) => m.YouTubePlayer),
  { ssr: false }
);
import { CourseSidebar } from '@/components/learn/CourseSidebar';
import apiClient from '@/lib/axios';
import type { CourseWithCurriculum, VideoProgress, LessonWithLock } from '@/types';

interface Props {
  params: { courseId: string; lessonId: string };
}

export default function LessonPage({ params }: Props) {
  const { courseId, lessonId } = params;
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [curriculum, setCurriculum] = useState<CourseWithCurriculum | null>(null);
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonWithLock | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);
  const completingRef = useRef(false);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId, _hasHydrated, isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    completingRef.current = false;
    try {
      const [curriculumRes, progressRes] = await Promise.allSettled([
        apiClient.get(`/courses/${courseId}`),
        apiClient.get(`/lessons/${lessonId}/progress`),
      ]);

      if (curriculumRes.status === 'fulfilled') {
        const c: CourseWithCurriculum = curriculumRes.value.data.data;
        setCurriculum(c);
        for (const section of c.sections) {
          const found = section.lessons.find((l) => l.id === lessonId);
          if (found) {
            setCurrentLesson(found);
            break;
          }
        }
      }

      if (progressRes.status === 'fulfilled') {
        setVideoProgress(progressRes.value.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProgress = useCallback(
    async (seconds: number) => {
      try {
        await apiClient.post(`/lessons/${lessonId}/progress`, {
          last_position_seconds: seconds,
          is_completed: false,
        });
      } catch {
        // silent
      }
    },
    [lessonId],
  );

  const handleComplete = useCallback(async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    try {
      await apiClient.post(`/lessons/${lessonId}/progress`, {
        last_position_seconds: currentLesson?.duration_seconds ?? 0,
        is_completed: true,
      });

      const res = await apiClient.get(`/courses/${courseId}`);
      const updatedCurriculum: CourseWithCurriculum = res.data.data;
      setCurriculum(updatedCurriculum);

      const allLessons = updatedCurriculum.sections.flatMap((s) => s.lessons);
      const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
      const nextLesson = allLessons.slice(currentIndex + 1).find((l) => !l.is_locked);

      if (nextLesson) {
        router.push(`/learn/${courseId}/${nextLesson.id}`);
      } else {
        completingRef.current = false;
      }
    } catch {
      completingRef.current = false;
    }
  }, [lessonId, courseId, currentLesson, router]);

  const handleManualComplete = async () => {
    if (markingComplete || completingRef.current) return;
    setMarkingComplete(true);
    await handleComplete();
    setMarkingComplete(false);
  };

  const allLessons: LessonWithLock[] = curriculum?.sections.flatMap((s) => s.lessons) ?? [];
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const completedCount = allLessons.filter((l) => l.is_completed).length;
  const progressPct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  if (!_hasHydrated || !isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground text-sm">Loading lesson…</div>
      </div>
    );
  }

  if (!curriculum || !currentLesson) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Lesson not found.</p>
      </div>
    );
  }

  if (currentLesson.is_locked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="glass-card rounded-2xl p-12 text-center space-y-4 max-w-md w-full">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
            Lesson Locked
          </h2>
          <p className="text-muted-foreground text-sm">
            Complete the previous lesson to unlock this one.
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold text-sm hover:bg-brand/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const videoId = currentLesson.youtube_url ?? '';

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
      {/* Main content */}
      <div className="flex-1 p-4 lg:p-6 space-y-4 min-w-0">
        {/* Breadcrumb + progress */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{curriculum.title}</p>
            <h1 className="text-xl font-bold mt-1" style={{ fontFamily: 'var(--font-space)' }}>
              {currentLesson.title}
            </h1>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Course Progress</p>
            <p className="text-sm font-bold text-brand">{progressPct}%</p>
          </div>
        </div>

        {/* Video Player */}
        {videoId ? (
          <YouTubePlayer
            videoId={videoId}
            startSeconds={videoProgress?.last_position_seconds ?? 0}
            onProgress={handleProgress}
            onComplete={handleComplete}
          />
        ) : (
          <div className="w-full aspect-video bg-muted rounded-xl flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No video available for this lesson.</p>
          </div>
        )}

        {/* Mark as Complete + Navigation */}
        <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
          <button
            onClick={() => {
              if (prevLesson && !prevLesson.is_locked) {
                router.push(`/learn/${courseId}/${prevLesson.id}`);
              }
            }}
            disabled={!prevLesson || prevLesson.is_locked}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {!currentLesson.is_completed && (
            <button
              onClick={handleManualComplete}
              disabled={markingComplete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand text-brand text-sm font-medium hover:bg-brand/10 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {markingComplete ? 'Marking…' : 'Mark as Complete'}
            </button>
          )}

          <button
            onClick={() => {
              if (nextLesson && !nextLesson.is_locked) {
                router.push(`/learn/${courseId}/${nextLesson.id}`);
              }
            }}
            disabled={!nextLesson || nextLesson.is_locked}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-zinc-900 text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border lg:overflow-y-auto lg:max-h-[calc(100vh-64px)]">
        <CourseSidebar
          curriculum={curriculum}
          currentLessonId={lessonId}
          onLessonClick={(id) => router.push(`/learn/${courseId}/${id}`)}
        />
      </div>
    </div>
  );
}
