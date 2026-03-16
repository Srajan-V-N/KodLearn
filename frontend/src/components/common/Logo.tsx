'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useThemeStore } from '@/stores/themeStore';

export function Logo() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center gap-0.5 select-none">
      <Image src="/K-logo.png" alt="KodLearn" width={26} height={26} style={{ height: 'auto' }} />
      <motion.span
        animate={{ color: isDark ? '#ffffff' : '#111111' }}
        transition={{ duration: 0.3 }}
        className="font-bold"
        style={{ fontFamily: 'var(--font-poppins)', fontSize: '26px', letterSpacing: '-0.03em' }}
      >
        odLearn
      </motion.span>
    </div>
  );
}
