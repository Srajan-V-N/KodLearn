import Link from 'next/link';
import { Clock, User, ArrowRight } from 'lucide-react';

const courses = [
  {
    title: 'JavaScript Fundamentals',
    instructor: 'Arjun Sharma',
    category: 'Programming',
    duration: '12.5h',
    description:
      'Master core JavaScript concepts from variables to async programming. Build real projects.',
  },
  {
    title: 'React & Next.js Mastery',
    instructor: 'Priya Nair',
    category: 'Web Development',
    duration: '18h',
    description:
      'Build production-ready full-stack apps with React 18 and Next.js 14. Covers server components.',
  },
  {
    title: 'Python for Data Science',
    instructor: 'Rahul Mehta',
    category: 'Data Science',
    duration: '15h',
    description:
      'Learn Python with NumPy, Pandas, and data visualization. Perfect for aspiring data analysts.',
  },
];

const categoryColors: Record<string, string> = {
  Programming: 'bg-blue-500/10 text-blue-500',
  'Web Development': 'bg-purple-500/10 text-purple-500',
  'Data Science': 'bg-green-500/10 text-green-500',
  Design: 'bg-pink-500/10 text-pink-500',
};

export function CoursesSection() {
  return (
    <section id="courses" className="py-20 px-4 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-3">
            <h2
              className="text-3xl sm:text-4xl font-bold"
              style={{ fontFamily: 'var(--font-space)' }}
            >
              Featured Courses
            </h2>
            <p className="text-muted-foreground">
              Hand-picked courses to get you started on your learning journey.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline shrink-0"
          >
            View all courses <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.title}
              className="rounded-2xl border border-border bg-card p-6 space-y-4 hover:border-brand/40 transition-colors flex flex-col"
            >
              <div className="space-y-2 flex-1">
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                    categoryColors[course.category] ?? 'bg-brand/10 text-brand'
                  }`}
                >
                  {course.category}
                </span>
                <h3 className="font-semibold leading-snug">{course.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{course.description}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {course.instructor}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {course.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
