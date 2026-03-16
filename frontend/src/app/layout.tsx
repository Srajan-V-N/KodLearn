import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Poppins } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const poppins = Poppins({ subsets: ['latin'], weight: '600', variable: '--font-poppins' });

export const metadata: Metadata = {
  title: 'KodLearn — Your Learning Management System',
  description: 'A modern LMS built for the digital age',
  icons: { icon: '/K-logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${poppins.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ScrollToTop />
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
