import { UserPlus, Search, BookOpen } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: UserPlus,
    title: 'Create Your Account',
    description: 'Sign up for free in under a minute. No credit card required.',
  },
  {
    step: '02',
    icon: Search,
    title: 'Browse Courses',
    description: 'Explore our library of expert-led courses across many disciplines.',
  },
  {
    step: '03',
    icon: BookOpen,
    title: 'Start Learning',
    description: 'Learn at your own pace, track your progress, and earn certificates.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2
            className="text-3xl sm:text-4xl font-bold"
            style={{ fontFamily: 'var(--font-space)' }}
          >
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get started in three simple steps and begin your learning journey today.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map(({ step, icon: Icon, title, description }) => (
            <div key={step} className="relative text-center space-y-4">
              <div className="flex flex-col items-center gap-3">
                <span
                  className="text-5xl font-bold text-brand/20"
                  style={{ fontFamily: 'var(--font-space)' }}
                >
                  {step}
                </span>
                <div className="w-12 h-12 rounded-2xl bg-brand/15 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-brand" />
                </div>
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
