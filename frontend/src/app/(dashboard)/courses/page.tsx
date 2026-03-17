'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageTransition } from '@/components/common/PageTransition';
import apiClient from '@/lib/axios';
import { CourseCard } from '@/components/courses/CourseCard';
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={enrolledMap.get(course.id)}
                  isWishlisted={wishlistIds.has(course.id)}
                  onWishlist={toggleWishlist}
                  onEnroll={handleEnroll}
                  enrolling={enrolling === course.id}
                  showWishlist
                />
              ))}
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
