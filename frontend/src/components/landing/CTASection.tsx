'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function CTASection() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div
          className="rounded-3xl border border-brand/30 bg-brand/5 p-12 space-y-6"
          style={{
            background:
              'linear-gradient(135deg, rgba(254,186,1,0.08) 0%, rgba(254,186,1,0.03) 100%)',
          }}
        >
          <h2
            className="text-3xl sm:text-4xl font-bold"
            style={{ fontFamily: 'var(--font-space)' }}
          >
            Start Learning Today
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Join thousands of learners already growing their skills on KodLearn. Your first course
            is free.
          </p>
          <Link
            href={_hasHydrated && isAuthenticated ? '/courses' : '/register'}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-brand text-zinc-900 font-semibold hover:bg-brand/90 transition-colors text-sm"
          >
            {_hasHydrated && isAuthenticated ? 'Browse All Courses' : 'Create Free Account'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
