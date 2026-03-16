'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, User, BookOpen, Lock, CheckCircle2, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageTransition } from '@/components/common/PageTransition';
import apiClient from '@/lib/axios';
import type { CourseWithCurriculum, Enrollment, LessonWithLock } from '@/types';

const categoryColors: Record<string, string> = {
  Programming: 'bg-blue-500/10 text-blue-500',
  'Web Development': 'bg-purple-500/10 text-purple-500',
  'Data Science': 'bg-green-500/10 text-green-500',
  Design: 'bg-pink-500/10 text-pink-500',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [course, setCourse] = useState<CourseWithCurriculum | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;
    async function fetchData() {
      try {
        const [courseRes, enrollmentsRes] = await Promise.all([
          apiClient.get(`/courses/${params.id}`),
          apiClient.get('/user/enrollments'),
        ]);
        const c: CourseWithCurriculum = courseRes.data.data;
        setCourse(c);
        // Expand first section by default
        if (c.sections.length > 0) {
          setExpandedSections(new Set([c.sections[0].id]));
        }
        const enrollments: Enrollment[] = enrollmentsRes.data.data ?? [];
        const found = enrollments.find((e) => e.courseId === params.id) ?? null;
        setEnrollment(found);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [_hasHydrated, isAuthenticated, params.id]);

  if (!_hasHydrated || !isAuthenticated) return null;

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await apiClient.post(`/courses/${params.id}/enroll`);
      const newEnrollment: Enrollment = res.data.data ?? res.data;
      setEnrollment(newEnrollment);
      // Redirect to first lesson
      const firstLesson = course?.sections.flatMap((s) => s.lessons)[0];
      if (firstLesson) {
        router.push(`/learn/${params.id}/${firstLesson.id}`);
      }
    } catch {
      // handled by interceptor
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinue = () => {
    if (!course) return;
    const allLessons: LessonWithLock[] = course.sections.flatMap((s) => s.lessons);
    // Find last unlocked, uncompleted lesson or first lesson
    const nextLesson =
      allLessons.find((l) => !l.is_locked && !l.is_completed) ??
      allLessons.find((l) => !l.is_locked) ??
      allLessons[0];
    if (nextLesson) {
      router.push(`/learn/${params.id}/${nextLesson.id}`);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-48 rounded-2xl bg-muted" />
        <div className="animate-pulse h-96 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Course not found.</p>
      </div>
    );
  }

  const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const completedLessons = course.sections
    .flatMap((s) => s.lessons)
    .filter((l) => l.is_completed).length;

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Course Hero */}
        <div className="glass-card rounded-2xl p-8 space-y-4">
          <span
            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
              categoryColors[course.category] ?? 'bg-brand/10 text-brand'
            }`}
          >
            {course.category}
          </span>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
            {course.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed">{course.description}</p>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-2 border-t border-border">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {course.instructor}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {course.duration_hours}h total
            </span>
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {totalLessons} lessons
            </span>
          </div>

          {enrollment ? (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {completedLessons}/{totalLessons} lessons completed
                </span>
                <span>{Math.round(enrollment.progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-brand h-2 rounded-full transition-all"
                  style={{ width: `${enrollment.progress}%` }}
                />
              </div>
              <button
                onClick={handleContinue}
                className="px-6 py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold text-sm hover:bg-brand/90 transition-colors"
              >
                Continue Learning
              </button>
            </div>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="px-6 py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold text-sm hover:bg-brand/90 transition-colors disabled:opacity-50"
            >
              {enrolling ? 'Enrolling…' : 'Enroll Now — Free'}
            </button>
          )}
        </div>

        {/* Curriculum */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
              Course Curriculum
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {course.sections.length} sections · {totalLessons} lessons
            </p>
          </div>
          <div>
            {course.sections.map((section) => {
              const isExpanded = expandedSections.has(section.id);
              const sectionCompleted = section.lessons.filter((l) => l.is_completed).length;
              return (
                <div key={section.id} className="border-b border-border last:border-0">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold text-sm">{section.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sectionCompleted}/{section.lessons.length} completed
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="bg-muted/20">
                      {section.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 px-6 py-3 border-t border-border/50"
                        >
                          <div className="flex-shrink-0">
                            {lesson.is_locked ? (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            ) : lesson.is_completed ? (
                              <CheckCircle2 className="w-4 h-4 text-brand" />
                            ) : (
                              <Play className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <p
                            className={`text-sm flex-1 ${
                              lesson.is_locked ? 'text-muted-foreground' : ''
                            }`}
                          >
                            {lesson.title}
                          </p>
                          {lesson.duration_seconds > 0 && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDuration(lesson.duration_seconds)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
