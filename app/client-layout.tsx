'use client';

import Navigation from '@/components/navigation';
import SplashCursor from '@/ReactBits/SplashCursor/SplashCursor';
import { usePathname } from 'next/navigation';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showSplashCursor = pathname === '/' || pathname === '/sign-in';

  return (
    <>
      <Navigation />
      {children}
      {showSplashCursor && <SplashCursor />}
    </>
  );
} 