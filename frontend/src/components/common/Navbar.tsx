'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Award, LayoutDashboard, BookOpen, GraduationCap, Heart, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/lib/axios';
import { toast } from 'sonner';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/my-learning', label: 'My Learning', icon: GraduationCap },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
];

export function Navbar() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continue with client-side logout even if server call fails
    }
    logout();
    router.replace('/login');
    toast.success('Logged out successfully');
  };

  return (
    <nav className="bg-background border-b border-border fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto px-6 max-w-7xl h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => router.push('/promptly')}
            className="w-9 h-9 rounded-full bg-muted border flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand transition-colors"
            aria-label="Open AI assistant"
          >
            <Bot className="w-4 h-4" />
          </button>
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setOpen((v) => !v)}
              className="w-9 h-9 rounded-full bg-muted border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Account menu"
            >
              <User className="w-4 h-4" />
            </motion.button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 glass-card border shadow-lg rounded-xl overflow-hidden"
                >
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted/60 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <Link
                    href="/certificates"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted/60 transition-colors border-t border-border/50"
                  >
                    <Award className="w-4 h-4" />
                    Certificates
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-muted/60 transition-colors border-t border-border/50"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}
