import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import { NotFound } from './not-found';
import 'react-day-picker/style.css';
import './index.css';

const isBookingPage = ['/', '/index.html'].includes(window.location.pathname);

if (!isBookingPage) {
  document.title = 'Página não encontrada | Agendamento de exames';
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {isBookingPage ? <App /> : <NotFound />}
    </QueryClientProvider>
  </StrictMode>,
);
