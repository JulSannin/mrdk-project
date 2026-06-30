// Единый источник SEO-меты сайта. Используется:
//  - routes.tsx (handle.title/description для клиентского <title>/<meta>),
//  - scripts/prerender.mts (генерация per-route index.html при сборке).
// Сюда входят только ИНДЕКСИРУЕМЫЕ статические маршруты (без /login, /admin, /404).

export const SITE_NAME = 'Мариинский районный дом культуры';
export const SITE_ORIGIN = 'https://nn-lance.ru';

export const SITE_DESCRIPTION =
  'Официальный сайт Мариинского районного Дома культуры: афиша и фотоотчёты мероприятий, клубы и кружки, планы работы, документы, контакты.';

export interface RouteMeta {
  /** Заголовок раздела; null = только имя сайта (главная). */
  title: string | null;
  description: string;
}

// path → мета. Динамические (/events/:id) и служебные (/login, /admin, *) — не здесь.
export const STATIC_ROUTES: Record<string, RouteMeta> = {
  '/': { title: null, description: SITE_DESCRIPTION },
  '/events': {
    title: 'События',
    description: 'Афиша и фотоотчёты мероприятий Мариинского районного Дома культуры.',
  },
  '/clubs': {
    title: 'Клубы и секции',
    description:
      'Клубные формирования и кружки Мариинского районного Дома культуры и их руководители.',
  },
  '/workplan': {
    title: 'Планы работы',
    description: 'Планы работы Мариинского районного Дома культуры по годам.',
  },
  '/documents': {
    title: 'Документы',
    description: 'Документы Мариинского районного Дома культуры.',
  },
  '/reminders': {
    title: 'Памятки',
    description: 'Памятки Мариинского районного Дома культуры.',
  },
  '/anticorruption': {
    title: 'Противодействие коррупции',
    description:
      'Противодействие коррупции: нормативные документы Мариинского районного Дома культуры.',
  },
  '/contacts': {
    title: 'Контакты',
    description: 'Контакты, адреса филиалов и форма обратной связи Мариинского районного Дома культуры.',
  },
};
