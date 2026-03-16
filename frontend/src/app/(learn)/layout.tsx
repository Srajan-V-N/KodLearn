import { Navbar } from '@/components/common/Navbar';
import { FloatingGradient } from '@/components/background/FloatingGradient';

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden min-h-screen bg-background">
      <FloatingGradient />
      <Navbar />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
