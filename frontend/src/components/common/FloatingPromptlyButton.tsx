'use client';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

export function FloatingPromptlyButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (
    pathname === '/promptly' ||
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')
  ) {
    return null;
  }

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
      <button
        onClick={() => router.push('/promptly')}
        className="bg-transparent border-none outline-none appearance-none p-0 hover:-translate-y-1 active:scale-[0.98] transition-all duration-200"
        aria-label="Open Promptly AI"
      >
        <Image src="/ChatBot-button.png" alt="Promptly" width={108} height={108} className="drop-shadow-lg" />
      </button>
    </div>
  );
}
