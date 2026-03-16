import { Timer, Users, Award, Bot } from 'lucide-react';

const features = [
  {
    icon: Timer,
    title: 'Learn at Your Pace',
    description:
      'Access course content any time, on any device. Pause, rewind, and revisit lessons whenever you need.',
  },
  {
    icon: Users,
    title: 'Expert Instructors',
    description:
      'Learn from industry professionals with real-world experience who break down complex concepts clearly.',
  },
  {
    icon: Award,
    title: 'Earn Certificates',
    description:
      'Complete courses and earn shareable certificates to showcase your skills to employers.',
  },
  {
    icon: Bot,
    title: 'AI Tutor',
    description:
      'Get instant answers and personalized guidance from our built-in AI assistant, Promptly.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2
            className="text-3xl sm:text-4xl font-bold"
            style={{ fontFamily: 'var(--font-space)' }}
          >
            Why KodLearn?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Everything you need to go from beginner to job-ready, all in one place.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-border p-6 space-y-4 hover:border-brand/40 transition-colors bg-card"
            >
              <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand" />
              </div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
