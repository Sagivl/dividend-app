'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const Layout = dynamic(() => import('@/Layout'), { ssr: false });

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoadingAuth, isAuthenticated, authError } = useAuth();

  const getPageName = () => {
    if (pathname === '/') return 'Dashboard';
    const segment = pathname.replace(/^\//, '').split('/')[0];
    return segment || 'Dashboard';
  };

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !authError) {
      router.replace('/login');
    }
  }, [isLoadingAuth, isAuthenticated, authError, router]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-destructive max-w-md">{authError.message}</p>
        <a
          href="/login"
          className="text-sm text-primary underline underline-offset-4 hover:text-primary/90"
        >
          Go to sign in
        </a>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Never return null here — that produced a blank screen while waiting for client navigation.
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <Layout currentPageName={getPageName()}>
      {children}
    </Layout>
  );
}
