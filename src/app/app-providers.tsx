import { useState, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from '@/features/billing/wallet-query';
import { InteractionProvider } from '@/components/ui';
import { AppErrorBoundary } from './app-error-boundary';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <AppErrorBoundary>
      <InteractionProvider>
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <BrowserRouter>{children}</BrowserRouter>
          </WalletProvider>
        </QueryClientProvider>
      </InteractionProvider>
    </AppErrorBoundary>
  );
}
