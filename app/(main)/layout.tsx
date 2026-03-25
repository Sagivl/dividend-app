'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/AuthContext';
import { usePathname } from 'next/navigation';

const Layout = dynamic(() => import('@/Layout'), { ssr: false });
const UserNotRegisteredError = dynamic(() => import('@/components/UserNotRegisteredError'), { ssr: false });

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Extract page name from pathname
  const getPageName = () => {
    if (pathname === '/') return 'Dashboard';
    const segment = pathname.replace(/^\//, '').split('/')[0];
    return segment || 'Dashboard';
  };

  // Show loading spinner while checking auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Layout currentPageName={getPageName()}>
      {children}
    </Layout>
  );
}
