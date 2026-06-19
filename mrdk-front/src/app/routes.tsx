/* eslint-disable react-refresh/only-export-components --
   Это файл-конфигурация роутера: он экспортирует объект `router`, а не
   компоненты. Правило про Fast Refresh здесь неприменимо. */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './root';
import { HomePage } from '../pages/home/HomePage';
import { EventsPage } from '../pages/events/EventsPage';
import { EventDetailPage } from '../pages/event/EventDetailPage';
import { ClubsPage } from '../pages/clubs/ClubsPage';
import { WorkPlanPage } from '../pages/workplan/WorkPlanPage';
import { DocumentsPage } from '../pages/documents/DocumentsPage';
import { RemindersPage } from '../pages/reminders/RemindersPage';
import { AntiCorruptionPage } from '../pages/anticorruption/AntiCorruptionPage';
import { ContactsPage } from '../pages/contacts/ContactsPage';
import { NotFoundPage } from '../pages/not-found/NotFoundPage';

// Админка (react-admin + MUI) и логин грузятся отдельными чанками,
// чтобы посетители публичного сайта их не скачивали.
const AdminApp = lazy(() =>
  import('../pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);
const LoginPage = lazy(() =>
  import('../pages/admin-login/LoginPage').then((m) => ({ default: m.LoginPage })),
);

export const router = createBrowserRouter([
  {

    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/events', element: <EventsPage /> },
      { path: '/events/:id', element: <EventDetailPage /> },
      { path: '/clubs', element: <ClubsPage /> },
      { path: '/workplan', element: <WorkPlanPage /> },
      { path: '/documents', element: <DocumentsPage /> },
      { path: '/reminders', element: <RemindersPage /> },
      { path: '/anticorruption', element: <AntiCorruptionPage /> },
      { path: '/contacts', element: <ContactsPage /> },
      { path: '/login', element: <Suspense fallback={null}><LoginPage /></Suspense> },
      { path: '/admin/*', element: <Suspense fallback={null}><AdminApp /></Suspense> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);