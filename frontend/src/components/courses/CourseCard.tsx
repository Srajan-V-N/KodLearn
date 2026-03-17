'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, User, Clock, Heart, CheckCircle2 } from 'lucide-react';
import { getCategoryColor, getCategoryGradient, renderStars } from '@/lib/utils';
import type { Course, Enrollment } from '@/types';

interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment;
  isWishlisted?: boolean;
  onWishlist?: (courseId: string, e: React.MouseEvent) => void;
  onEnroll?: (courseId: string) => void;
  enrolling?: boolean;
  showWishlist?: boolean;
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
            <Star
              className="w-3 h-3 fill-yellow-400 text-yellow-400 absolute"
              style={{ clipPath: 'inset(0 50% 0 0)' }}
            />
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className="w-3 h-3 text-muted-foreground" />
        ))}
      </span>
      <span className="text-muted-foreground">
        {rating.toFixed(1)} ({count})
      </span>
    </span>
  );
}

export function CourseCard({
  course,
  enrollment,
  isWishlisted = false,
  onWishlist,
  onEnroll,
  enrolling = false,
  showWishlist = false,
}: CourseCardProps) {
  const router = useRouter();

  const isCompleted = enrollment?.completed === true;
  const hasStarted = (enrollment?.progress ?? 0) > 0;
  const isEnrolled = Boolean(enrollment);

  return (
    <div className="group rounded-2xl border border-border bg-card hover:border-brand/40 hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 flex flex-col overflow-hidden h-full shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      {/* Thumbnail */}
      <div className="relative">
        {course.thumbnail_url ? (
          <div className="relative w-full aspect-video overflow-hidden">
            <Image
              src={course.thumbnail_url}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div
            className={`w-full aspect-video bg-gradient-to-br ${getCategoryGradient(course.category)} flex items-center justify-center`}
          >
            <span className="text-4xl font-bold text-white/70 select-none">
              {course.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-semibold backdrop-blur-sm z-10">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </div>
        )}

        {/* Wishlist button */}
        {showWishlist && onWishlist && (
          <button
            onClick={(e) => onWishlist(course.id, e)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-white'}`}
            />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-3 flex flex-col flex-1">
        <div className="space-y-1.5 flex-1">
          <span
            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryColor(course.category)}`}
          >
            {course.category}
          </span>
          <h3 className="font-semibold text-sm leading-snug">
            <Link href={`/courses/${course.id}`} className="hover:text-brand transition-colors">
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

        {/* Action section */}
        {isCompleted ? (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-500">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </span>
            <button
              onClick={() => router.push('/certificates')}
              className="px-4 py-2 rounded-xl bg-brand text-zinc-900 text-xs font-semibold hover:brightness-110 active:scale-[0.96] transition-all"
            >
              View Certificate
            </button>
          </div>
        ) : isEnrolled ? (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-brand/80 h-full rounded-full transition-[width] duration-500"
                style={{ width: `${enrollment!.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {Math.round(enrollment!.progress)}%
              </span>
              <button
                onClick={() => router.push(`/courses/${course.id}`)}
                className="px-4 py-2 rounded-xl border border-border text-foreground text-xs font-semibold hover:bg-muted active:scale-[0.96] transition-all"
              >
                {hasStarted ? 'Continue' : 'Start'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end pt-2 border-t border-border">
            <button
              onClick={() => onEnroll?.(course.id)}
              disabled={enrolling}
              className="px-4 py-2 rounded-xl bg-brand text-zinc-900 text-xs font-semibold hover:brightness-110 active:scale-[0.96] transition-all disabled:opacity-50"
            >
              {enrolling ? 'Enrolling…' : 'Enroll'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
