import { Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Aditi Verma',
    role: 'Frontend Developer',
    text: 'KodLearn helped me land my first dev job. The React course was incredibly detailed and practical. I went from zero to building real projects in just 3 months.',
  },
  {
    name: 'Karan Bhatia',
    role: 'Data Analyst',
    text: 'The Python for Data Science course is top-notch. The instructor breaks down complex concepts so clearly. The AI tutor was a game-changer when I got stuck.',
  },
  {
    name: 'Meera Iyer',
    role: 'UX Designer',
    text: 'I completed the UI/UX Design course and immediately got freelance clients. The certificate gave me the credibility I needed to charge more.',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 px-4 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2
            className="text-3xl sm:text-4xl font-bold"
            style={{ fontFamily: 'var(--font-space)' }}
          >
            Student Stories
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Hear from learners who transformed their careers with KodLearn.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {testimonials.map(({ name, role, text }) => (
            <div
              key={name}
              className="rounded-2xl border border-border bg-card p-6 space-y-4 flex flex-col"
            >
              <Quote className="w-5 h-5 text-brand/60 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{text}</p>
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
