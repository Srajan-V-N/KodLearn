'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, User, Star, Heart, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageTransition } from '@/components/common/PageTransition';
import apiClient from '@/lib/axios';
import { getCategoryColor, getCategoryGradient, renderStars } from '@/lib/utils';
import type { ApiResponse, Course, CoursesResponse, Enrollment } from '@/types';

const CATEGORIES = [
  'All',
  'Programming',
  'Web Development',
  'Data Science',
  'Design',
  'Artificial Intelligence',
  'Cloud Computing',
  'Cybersecurity',
  'DevOps',
];

function CourseThumbnail({ course }: { course: Course }) {
  if (course.thumbnail_url) {
    return (
      <div className="relative w-full aspect-video rounded-t-2xl overflow-hidden">
        <Image
          src={course.thumbnail_url}
          alt={course.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
    );
  }
  const gradient = getCategoryGradient(course.category);
  return (
    <div
      className={`w-full aspect-video rounded-t-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}
    >
      <span className="text-4xl font-bold text-white/70 select-none">
        {course.title.charAt(0)}
      </span>
    </div>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const { full, half, empty } = renderStars(rating);
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className="flex">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        ))}
        {half && (
          <span className="relative w-3 h-3">
            <Star className="w-3 h-3 text-yellow-400 absolute" />
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 absolute" style={{ clipPath: 'inset(0 50% 0 0)' }} />
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className="w-3 h-3 text-muted-foreground" />
        ))}
      </span>
      <span className="text-muted-foreground">{rating.toFixed(1)} ({count})</span>
    </span>
  );
}

export default function CoursesPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  const fetchCourses = useCallback(
    async (searchVal: string, categoryVal: string, pageVal: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchVal) params.set('search', searchVal);
        if (categoryVal && categoryVal !== 'All') params.set('category', categoryVal);
        params.set('page', String(pageVal));
        params.set('limit', '9');

        const res = await apiClient.get<ApiResponse<CoursesResponse>>(`/courses?${params}`);
        const result: CoursesResponse = res.data.data;
        setCourses(result.data);
        setTotalPages(result.totalPages);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;

    async function init() {
      try {
        const [enrollRes, wishRes] = await Promise.all([
          apiClient.get('/user/enrollments'),
          apiClient.get('/wishlist'),
        ]);
        setEnrollments(enrollRes.data.data ?? []);
        const wishlist: Array<{ courseId: string }> = wishRes.data.data ?? [];
        setWishlistIds(new Set(wishlist.map((w) => w.courseId)));
      } catch {
        // handled
      }
    }
    init();
    fetchCourses('', 'All', 1);
  }, [_hasHydrated, isAuthenticated, fetchCourses]);

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCourses(val, category, 1);
    }, 300);
  }

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    setPage(1);
    fetchCourses(search, cat, 1);
  }

  function handlePageChange(p: number) {
    setPage(p);
    fetchCourses(search, category, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!_hasHydrated || !isAuthenticated) return null;

  const enrolledMap = new Map(enrollments.map((e) => [e.courseId, e]));

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId);
    try {
      const res = await apiClient.post(`/courses/${courseId}/enroll`);
      const newEnrollment: Enrollment = res.data.data ?? res.data;
      setEnrollments((prev) => [...prev, newEnrollment]);
    } catch {
      // handled
    } finally {
      setEnrolling(null);
    }
  }

  async function toggleWishlist(courseId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const isWishlisted = wishlistIds.has(courseId);
    try {
      if (isWishlisted) {
        await apiClient.delete(`/wishlist/${courseId}`);
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(courseId);
          return next;
        });
      } else {
        await apiClient.post(`/wishlist/${courseId}`);
        setWishlistIds((prev) => new Set(prev).add(courseId));
      }
    } catch {
      // handled
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
            Browse Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore all available courses and start learning today.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                category === cat
                  ? 'bg-brand text-zinc-900 border-brand'
                  : 'border-border text-muted-foreground hover:border-brand/50 hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card animate-pulse">
                <div className="aspect-video rounded-t-2xl bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-muted rounded w-20" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-8 bg-muted rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-muted-foreground">
              {search
                ? `No courses found for "${search}"`
                : 'No courses available in this category.'}
            </p>
            {search && (
              <button
                onClick={() => handleSearchChange('')}
                className="text-brand text-sm underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const enrollment = enrolledMap.get(course.id);
                const isEnrolled = Boolean(enrollment);
                const isWishlisted = wishlistIds.has(course.id);

                return (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-border bg-card hover:border-brand/40 transition-colors flex flex-col overflow-hidden"
                  >
                    {/* Thumbnail */}
                    <div className="relative">
                      <CourseThumbnail course={course} />
                      <button
                        onClick={(e) => toggleWishlist(course.id, e)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isWishlisted ? 'fill-red-500 text-red-500' : 'text-white'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-5 space-y-3 flex flex-col flex-1">
                      <div className="space-y-1.5 flex-1">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryColor(
                            course.category,
                          )}`}
                        >
                          {course.category}
                        </span>
                        <h3 className="font-semibold leading-snug">
                          <Link
                            href={`/courses/${course.id}`}
                            className="hover:text-brand transition-colors"
                          >
                            {course.title}
                          </Link>
                        </h3>
                        {course.avg_rating != null && course.rating_count! > 0 && (
                          <StarRating rating={course.avg_rating} count={course.rating_count!} />
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-2">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {course.instructor}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.duration_hours}h
                        </span>
                      </div>

                      {isEnrolled && enrollment ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{Math.round(enrollment.progress)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-brand h-1.5 rounded-full transition-all"
                              style={{ width: `${enrollment.progress}%` }}
                            />
                          </div>
                          <button
                            onClick={() => router.push(`/courses/${course.id}`)}
                            className="w-full text-sm font-medium py-2 rounded-xl border border-brand text-brand hover:bg-brand/10 transition-colors"
                          >
                            Continue
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEnroll(course.id)}
                          disabled={enrolling === course.id}
                          className="w-full text-sm font-medium py-2 rounded-xl bg-brand text-zinc-900 hover:bg-brand/90 transition-colors disabled:opacity-50"
                        >
                          {enrolling === course.id ? 'Enrolling…' : 'Enroll'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
