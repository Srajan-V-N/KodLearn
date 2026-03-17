import { Navbar } from '@/components/common/Navbar';
import { FloatingGradient } from '@/components/background/FloatingGradient';
import { FloatingPromptlyButton } from '@/components/common/FloatingPromptlyButton';

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden min-h-screen bg-background">
      <FloatingGradient />
      <Navbar />
      <FloatingPromptlyButton />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
