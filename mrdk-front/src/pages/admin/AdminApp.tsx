import { Admin, Resource } from 'react-admin';
import polyglotI18nProvider from 'ra-i18n-polyglot';
import russianMessages from 'ra-language-russian';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/ui/AuthContext';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';

const i18nProvider = polyglotI18nProvider(() => russianMessages, 'ru');
import { EventList, EventCreate, EventEdit } from './resources/events';
import { WorkPlanList, WorkPlanCreate, WorkPlanEdit } from './resources/workplan';
import { DocumentList, DocumentCreate, DocumentEdit } from './resources/documents';
import { ReminderList, ReminderCreate, ReminderEdit } from './resources/reminders';
import { ClubList, ClubCreate, ClubEdit } from './resources/clubs';

export function AdminApp() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <p style={{ padding: 24 }}>Загрузка…</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <Admin
      basename="/admin"
      authProvider={authProvider}
      dataProvider={dataProvider}
      i18nProvider={i18nProvider}
      loginPage={false}
    >
      <Resource name="events" options={{ label: 'События' }}
        list={EventList} create={EventCreate} edit={EventEdit} />
      <Resource name="workplan" options={{ label: 'План работы' }}
        list={WorkPlanList} create={WorkPlanCreate} edit={WorkPlanEdit} />
      <Resource name="documents" options={{ label: 'Документы' }}
        list={DocumentList} create={DocumentCreate} edit={DocumentEdit} />
      <Resource name="reminders" options={{ label: 'Памятки' }}
        list={ReminderList} create={ReminderCreate} edit={ReminderEdit} />
      <Resource name="clubs" options={{ label: 'Клубы' }}
        list={ClubList} create={ClubCreate} edit={ClubEdit} />
    </Admin>
  );
}