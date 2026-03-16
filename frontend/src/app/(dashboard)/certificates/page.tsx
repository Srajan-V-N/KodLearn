'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageTransition } from '@/components/common/PageTransition';
import apiClient from '@/lib/axios';
import type { Certificate } from '@/types';
import { toast } from 'sonner';

export default function CertificatesPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;
    apiClient
      .get('/user/certificates')
      .then((res) => setCertificates(res.data.data ?? []))
      .catch(() => setCertificates([]))
      .finally(() => setLoading(false));
  }, [_hasHydrated, isAuthenticated]);

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <PageTransition>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
            Certificates
          </h1>
          <p className="text-muted-foreground mt-1">
            Your earned certificates of completion.
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse h-48 rounded-2xl bg-muted" />
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Award className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
            <div>
              <p className="font-semibold">No certificates yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Complete a course to earn your first certificate.
              </p>
            </div>
            <button
              onClick={() => router.push('/courses')}
              className="px-6 py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold text-sm hover:bg-brand/90 transition-colors"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="glass-card rounded-2xl p-6 space-y-4 border border-brand/20 hover:border-brand/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-brand" />
                  </div>
                  <span className="text-xs text-muted-foreground pt-1 whitespace-nowrap">
                    {new Date(cert.issued_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-brand uppercase tracking-wide">
                    Certificate of Completion
                  </p>
                  <p className="font-bold mt-1 leading-snug">{cert.course.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{cert.course.instructor}</p>
                </div>
                <button
                  onClick={() => toast.info('PDF download coming soon!')}
                  className="w-full text-xs font-medium py-2 rounded-xl border border-brand text-brand hover:bg-brand/10 transition-colors"
                >
                  Download Certificate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
