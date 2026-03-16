'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import apiClient from '@/lib/axios';
import { Logo } from '@/components/common/Logo';

const fields = [
  { id: 'uid' as const, label: 'User ID', placeholder: 'unique_id_123', type: 'text', autoComplete: 'username' },
  { id: 'username' as const, label: 'Username', placeholder: 'johndoe', type: 'text', autoComplete: 'nickname' },
  { id: 'email' as const, label: 'Email', placeholder: 'you@example.com', type: 'email', autoComplete: 'email' },
  { id: 'phone' as const, label: 'Phone', placeholder: '+91 98765 43210', type: 'tel', autoComplete: 'tel' },
] as const;

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/register', { ...data, role: 'Customer' });
      toast.success('Account created! Please sign in.');
      router.push('/login');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8 space-y-6">
      {/* Header */}
      <div>
        <Logo />
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-space)' }}>
          Create account
        </h1>
        <p className="text-muted-foreground text-sm">Join KodLearn today — free forever</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {fields.map(({ id, label, placeholder, type, autoComplete }) => (
          <div key={id} className="space-y-1">
            <label htmlFor={id} className="text-sm font-medium">
              {label}
            </label>
            <input
              id={id}
              type={type}
              autoComplete={autoComplete}
              {...register(id)}
              placeholder={placeholder}
              className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors text-sm"
            />
            {errors[id] && (
              <p className="text-destructive text-xs">{errors[id]?.message}</p>
            )}
          </div>
        ))}

        {/* Password */}
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password')}
              placeholder="Min. 8 characters"
              className="w-full px-3 py-2 pr-10 rounded-lg bg-background/50 border border-border focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-destructive text-xs">{errors.password.message}</p>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 mt-1 rounded-lg bg-brand text-zinc-900 font-semibold flex items-center justify-center gap-2 hover:bg-brand-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {isLoading ? 'Creating account…' : 'Create account'}
        </motion.button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-brand hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
