import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/theme-provider";
import Navigation from '@/components/navigation';
import SplashCursor from '@/ReactBits/SplashCursor/SplashCursor';
import { UserProvider } from './context/UserContext';
import ClientLayout from './client-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SignSync - Interactive Sign Language Learning Platform',
  description: 'Learn sign language through interactive 3D experiences, AI-powered translation, and real-time communication.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <UserProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <ClientLayout>
              {children}
            </ClientLayout>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
