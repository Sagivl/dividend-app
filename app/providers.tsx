'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import NavigationTracker from '@/lib/NavigationTracker';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <NavigationTracker />
        {children}
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
