import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'SiteScope — Website Intelligence Scanner',
  description:
    'Instantly scan any website for SEO, messaging, CRO, and tech stack insights. Free, no login required.',
  openGraph: {
    title: 'SiteScope — Website Intelligence Scanner',
    description: 'Free website audit: SEO, messaging, conversion optimization, and tech stack analysis.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
