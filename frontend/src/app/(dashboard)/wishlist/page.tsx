'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Clock, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageTransition } from '@/components/common/PageTransition';
import apiClient from '@/lib/axios';
import { getCategoryColor, getCategoryGradient } from '@/lib/utils';
import type { WishlistItem } from '@/types';

function CourseThumbnail({ item }: { item: WishlistItem }) {
  const { course } = item;
  if (course.thumbnail_url) {
    return (
      <div className="relative w-full aspect-video rounded-t-2xl overflow-hidden">
        <Image
          src={course.thumbnail_url}
          alt={course.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
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

export default function WishlistPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;
    apiClient
      .get('/wishlist')
      .then((res) => setWishlist(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [_hasHydrated, isAuthenticated]);

  if (!_hasHydrated || !isAuthenticated) return null;

  async function handleRemove(courseId: string) {
    try {
      await apiClient.delete(`/wishlist/${courseId}`);
      setWishlist((prev) => prev.filter((w) => w.courseId !== courseId));
    } catch {
      // handled
    }
  }

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId);
    try {
      await apiClient.post(`/courses/${courseId}/enroll`);
      router.push(`/courses/${courseId}`);
    } catch {
      // handled
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
            My Wishlist
          </h1>
          <p className="text-muted-foreground mt-1">Courses you&apos;ve saved for later.</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card animate-pulse">
                <div className="aspect-video rounded-t-2xl bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-muted rounded w-20" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-8 bg-muted rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Your wishlist is empty.</p>
            <button
              onClick={() => router.push('/courses')}
              className="px-6 py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold text-sm hover:bg-brand/90 transition-colors"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlist.map((item) => {
              const { course } = item;
              return (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-border bg-card hover:border-brand/40 hover:-translate-y-1 transition-all duration-200 flex flex-col overflow-hidden"
                >
                  <div className="relative">
                    <CourseThumbnail item={item} />
                    <button
                      onClick={() => handleRemove(course.id)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                      aria-label="Remove from wishlist"
                    >
                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
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
                      <h3 className="font-semibold leading-snug text-sm">{course.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
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

                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrolling === course.id}
                      className="w-full text-sm font-medium py-2 rounded-xl bg-brand text-zinc-900 hover:bg-brand/90 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {enrolling === course.id ? 'Enrolling…' : 'Enroll Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
