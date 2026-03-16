'use client';

import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function HeroSection() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32 px-4">
      {/* Background accent */}
      <div
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, #feba01 0%, transparent 70%)',
        }}
      />

      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/40 bg-brand/10 text-brand text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          The Future of Online Learning
        </div>

        <h1
          className="text-4xl sm:text-6xl font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'var(--font-space)' }}
        >
          Learn Without{' '}
          <span className="text-brand">Limits</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Master in-demand skills with expert-led courses, AI-powered tutoring, and a community
          that grows with you. Start your journey today.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={_hasHydrated && isAuthenticated ? '/courses' : '/register'}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-zinc-900 font-semibold hover:bg-brand/90 transition-colors text-sm"
          >
            {_hasHydrated && isAuthenticated ? 'Browse Courses' : 'Start Learning Free'}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/#courses"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors text-sm"
          >
            <Play className="w-4 h-4 text-brand" />
            Browse Courses
          </Link>
        </div>
      </div>
    </section>
  );
}
