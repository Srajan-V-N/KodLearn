'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Clock,
  User,
  BookOpen,
  Lock,
  CheckCircle2,
  Play,
  ChevronDown,
  ChevronUp,
  Star,
  Heart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageTransition } from '@/components/common/PageTransition';
import apiClient from '@/lib/axios';
import { getCategoryColor, getCategoryGradient, renderStars } from '@/lib/utils';
import type { CourseWithCurriculum, Enrollment, LessonWithLock, Review } from '@/types';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function StarRating({ rating, count, size = 'sm' }: { rating: number; count: number; size?: 'sm' | 'lg' }) {
  const { full, half, empty } = renderStars(rating);
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <span className="flex items-center gap-1">
      <span className="flex">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className={`${cls} fill-yellow-400 text-yellow-400`} />
        ))}
        {half && (
          <span className={`relative ${cls}`}>
            <Star className={`${cls} text-yellow-400 absolute`} />
            <Star className={`${cls} fill-yellow-400 text-yellow-400 absolute`} style={{ clipPath: 'inset(0 50% 0 0)' }} />
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className={`${cls} text-muted-foreground`} />
        ))}
      </span>
      <span className={`text-muted-foreground ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
        {rating.toFixed(1)} ({count} {count === 1 ? 'review' : 'reviews'})
      </span>
    </span>
  );
}

function ReviewForm({
  courseId,
  existing,
  onSubmitted,
}: {
  courseId: string;
  existing: Review | null;
  onSubmitted: (r: Review) => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/courses/${courseId}/reviews`, { rating, comment });
      onSubmitted(res.data.data);
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t border-border">
      <p className="text-sm font-semibold">{existing ? 'Edit your review' : 'Leave a review'}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                s <= (hover || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts (optional)"
        rows={3}
        className="w-full px-3 py-2 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none"
      />
      <button
        type="submit"
        disabled={rating === 0 || submitting}
        className="px-5 py-2 rounded-xl bg-brand text-zinc-900 text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : existing ? 'Update Review' : 'Submit Review'}
      </button>
    </form>
  );
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [course, setCourse] = useState<CourseWithCurriculum | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
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
        const [courseRes, enrollmentsRes, reviewsRes, wishlistRes] = await Promise.all([
          apiClient.get(`/courses/${params.id}`),
          apiClient.get('/user/enrollments'),
          apiClient.get(`/courses/${params.id}/reviews`),
          apiClient.get('/wishlist'),
        ]);
        const c: CourseWithCurriculum = courseRes.data.data;
        setCourse(c);
        if (c.sections.length > 0) {
          setExpandedSections(new Set([c.sections[0].id]));
        }
        const enrollments: Enrollment[] = enrollmentsRes.data.data ?? [];
        setEnrollment(enrollments.find((e) => e.courseId === params.id) ?? null);

        const reviewData = reviewsRes.data.data;
        setReviews(reviewData?.reviews ?? []);
        setUserReview(reviewData?.userReview ?? null);

        const wishlist: Array<{ courseId: string }> = wishlistRes.data.data ?? [];
        setIsWishlisted(wishlist.some((w) => w.courseId === params.id));
      } catch {
        // handled
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
      const firstLesson = course?.sections.flatMap((s) => s.lessons)[0];
      if (firstLesson) {
        router.push(`/learn/${params.id}/${firstLesson.id}`);
      }
    } catch {
      // handled
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinue = () => {
    if (!course) return;
    const allLessons: LessonWithLock[] = course.sections.flatMap((s) => s.lessons);
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
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const toggleWishlist = async () => {
    try {
      if (isWishlisted) {
        await apiClient.delete(`/wishlist/${params.id}`);
        setIsWishlisted(false);
      } else {
        await apiClient.post(`/wishlist/${params.id}`);
        setIsWishlisted(true);
      }
    } catch {
      // handled
    }
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

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Course Hero */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Thumbnail banner */}
          {course.thumbnail_url ? (
            <div className="relative w-full h-52">
              <Image
                src={course.thumbnail_url}
                alt={course.title}
                fill
                className="object-cover"
                sizes="(max-width: 896px) 100vw, 896px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div
              className={`w-full h-40 bg-gradient-to-br ${getCategoryGradient(
                course.category,
              )} relative`}
            >
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}

          <div className="p-8 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryColor(
                  course.category,
                )}`}
              >
                {course.category}
              </span>
              <button
                onClick={toggleWishlist}
                className="flex-shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isWishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                  }`}
                />
              </button>
            </div>

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
              {avgRating != null && (
                <StarRating rating={avgRating} count={reviews.length} />
              )}
            </div>

            {enrollment ? (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{completedLessons}/{totalLessons} lessons completed</span>
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
        </div>

        {/* What You'll Learn */}
        {course.sections.length > 0 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
              What You&apos;ll Learn
            </h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {course.sections.map((section) => (
                <li key={section.id} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                  <span>{section.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

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

        {/* Reviews */}
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
                Student Reviews
              </h2>
              {avgRating != null && (
                <div className="mt-1">
                  <StarRating rating={avgRating} count={reviews.length} size="lg" />
                </div>
              )}
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => {
                const { full, half, empty } = renderStars(review.rating);
                return (
                  <div key={review.id} className="border-t border-border pt-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{review.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="flex">
                      {Array.from({ length: full }).map((_, i) => (
                        <Star key={`f${i}`} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                      {half && (
                        <span className="relative w-3.5 h-3.5">
                          <Star className="w-3.5 h-3.5 text-yellow-400 absolute" />
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 absolute" style={{ clipPath: 'inset(0 50% 0 0)' }} />
                        </span>
                      )}
                      {Array.from({ length: empty }).map((_, i) => (
                        <Star key={`e${i}`} className="w-3.5 h-3.5 text-muted-foreground" />
                      ))}
                    </span>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
          )}

          {enrollment && (
            <ReviewForm
              courseId={params.id}
              existing={userReview}
              onSubmitted={(r) => {
                setUserReview(r);
                setReviews((prev) => {
                  const idx = prev.findIndex((rv) => rv.userId === r.userId);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = r;
                    return next;
                  }
                  return [r, ...prev];
                });
              }}
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
