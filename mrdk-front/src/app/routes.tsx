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
import { RouteError } from '../shared/ui/RouteError';

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
    // ловит необработанные ошибки рендера любой страницы — вместо белого экрана
    errorElement: <RouteError />,
    children: [
      // handle.title → <title> "<раздел> — <SITE_NAME>"; { title: null } = только имя сайта.
      // У /events/:id и /admin/* handle нет — там title ставит сама страница / react-admin.
      { path: '/', element: <HomePage />, handle: { title: null } },
      { path: '/events', element: <EventsPage />, handle: { title: 'События' } },
      { path: '/events/:id', element: <EventDetailPage /> },
      { path: '/clubs', element: <ClubsPage />, handle: { title: 'Клубы и секции' } },
      { path: '/workplan', element: <WorkPlanPage />, handle: { title: 'Планы работы' } },
      { path: '/documents', element: <DocumentsPage />, handle: { title: 'Документы' } },
      { path: '/reminders', element: <RemindersPage />, handle: { title: 'Памятки' } },
      { path: '/anticorruption', element: <AntiCorruptionPage />, handle: { title: 'Противодействие коррупции' } },
      { path: '/contacts', element: <ContactsPage />, handle: { title: 'Контакты' } },
      { path: '/login', element: <Suspense fallback={null}><LoginPage /></Suspense>, handle: { title: 'Вход в админ-панель' } },
      { path: '/admin/*', element: <Suspense fallback={null}><AdminApp /></Suspense> },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Страница не найдена' } },
    ],
  },
]);