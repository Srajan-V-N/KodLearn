'use client';

import { X, Download } from 'lucide-react';

interface CertificatePrintModalProps {
  userName: string;
  courseTitle: string;
  instructor: string;
  issuedAt: string;
  certId: string;
  onClose: () => void;
}

export function CertificatePrintModal({
  userName,
  courseTitle,
  instructor,
  issuedAt,
  certId,
  onClose,
}: CertificatePrintModalProps) {
  const formattedDate = new Date(issuedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl space-y-4">
        {/* Certificate */}
        <div
          id="certificate-print-root"
          className="bg-white rounded-2xl overflow-hidden border-t-4 border-[#feba01] shadow-2xl"
        >
          {/* Gold top accent */}
          <div className="h-1 bg-gradient-to-r from-[#feba01] via-yellow-300 to-[#feba01]" />

          <div className="p-10 text-center space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#feba01]">
                KodLearn
              </p>
              <h1
                className="text-3xl font-bold text-zinc-800"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Certificate of Completion
              </h1>
            </div>

            {/* Decorative divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#feba01]/40 to-transparent" />
              <div className="w-2 h-2 rounded-full bg-[#feba01]" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#feba01]/40 to-transparent" />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <p className="text-sm text-zinc-500">This is to certify that</p>
              <p
                className="text-4xl font-bold text-zinc-800"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {userName}
              </p>
              <p className="text-sm text-zinc-500">has successfully completed</p>
              <p className="text-xl font-bold text-[#feba01] mt-1">{courseTitle}</p>
            </div>

            {/* Decorative divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#feba01]/40 to-transparent" />
              <div className="w-2 h-2 rounded-full bg-[#feba01]" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#feba01]/40 to-transparent" />
            </div>

            {/* Footer metadata */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Instructor</p>
                <p className="text-sm font-semibold text-zinc-700 mt-1">{instructor}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Date Issued</p>
                <p className="text-sm font-semibold text-zinc-700 mt-1">{formattedDate}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Certificate ID</p>
                <p className="text-xs font-mono text-zinc-500 mt-1 break-all">{certId.slice(0, 12)}…</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-zinc-900 text-sm font-semibold hover:brightness-110 active:scale-[0.96] transition-all shadow-lg"
          >
            <Download className="w-4 h-4" />
            Download as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
