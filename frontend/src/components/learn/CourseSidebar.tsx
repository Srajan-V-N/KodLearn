'use client';

import { Lock, CheckCircle2, Play } from 'lucide-react';
import type { CourseWithCurriculum } from '@/types';

interface CourseSidebarProps {
  curriculum: CourseWithCurriculum;
  currentLessonId: string;
  onLessonClick: (lessonId: string) => void;
}

export function CourseSidebar({
  curriculum,
  currentLessonId,
  onLessonClick,
}: CourseSidebarProps) {
  return (
    <div className="glass-card h-full">
      <div className="p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <h3 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-space)' }}>
          Course Content
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{curriculum.title}</p>
      </div>
      <div className="overflow-y-auto">
        {curriculum.sections.map((section) => (
          <div key={section.id}>
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {section.title}
              </p>
            </div>
            {section.lessons.map((lesson) => {
              const isCurrent = lesson.id === currentLessonId;
              return (
                <button
                  key={lesson.id}
                  onClick={() => !lesson.is_locked && onLessonClick(lesson.id)}
                  disabled={lesson.is_locked}
                  className={[
                    'w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/50 transition-colors',
                    isCurrent ? 'bg-brand/10 border-l-2 border-l-brand' : '',
                    lesson.is_locked
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-muted/50 cursor-pointer',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {lesson.is_locked ? (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : lesson.is_completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                    ) : isCurrent ? (
                      <Play className="w-3.5 h-3.5 text-brand fill-brand" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-medium leading-snug ${
                        isCurrent ? 'text-brand' : ''
                      }`}
                    >
                      {lesson.title}
                    </p>
                    {lesson.duration_seconds > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Math.floor(lesson.duration_seconds / 60)}m
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
