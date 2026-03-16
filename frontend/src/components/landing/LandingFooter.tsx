import Link from 'next/link';
import { Logo } from '@/components/common/Logo';

const links = [
  { href: '/#courses', label: 'Courses' },
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/login', label: 'Login' },
  { href: '/register', label: 'Register' },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <Logo />

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} KodLearn. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
