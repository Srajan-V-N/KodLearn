import { Users, BookOpen, GraduationCap } from 'lucide-react';

const stats = [
  { icon: Users, value: '10,000+', label: 'Students' },
  { icon: BookOpen, value: '200+', label: 'Courses' },
  { icon: GraduationCap, value: '50+', label: 'Instructors' },
];

export function StatsSection() {
  return (
    <section className="py-12 px-4 border-y border-border bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-6 text-center">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
              </div>
              <p
                className="text-2xl sm:text-3xl font-bold"
                style={{ fontFamily: 'var(--font-space)' }}
              >
                {value}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
