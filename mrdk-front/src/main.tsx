import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { BviProvider } from './shared/ui/BviContext';
import { queryClient } from './shared/lib/queryClient';
import { router } from './app/routes';
import './app/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BviProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </BviProvider>
  </StrictMode>,
);