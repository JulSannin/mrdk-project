import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { BviProvider } from './shared/bvi/BviContext';
import { queryClient } from './shared/lib/queryClient';
import { router } from './app/routes';
import './app/app.css';
// Строго после app.css: режим для слабовидящих намеренно перекрывает базовые
// стили сайта, и порядок в каскаде здесь значим.
import './shared/bvi/bvi.css';

createRoot(document.getElementById('root')!).render(
  <BviProvider>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </BviProvider>,
);
