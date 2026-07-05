import type { Request, Response } from 'express';

const ORIGIN = process.env.SITE_ORIGIN || 'https://nn-lance.ru';

// Статические индексируемые маршруты — держать синхронно с
// mrdk-front/src/shared/config/siteMeta.ts (STATIC_ROUTES).
// Дрейф ловит sitemap.test.ts — он сверяет этот список с файлом фронта.
export const STATIC_PATHS = [
  '/', '/events', '/clubs', '/workplan', '/documents', '/reminders', '/anticorruption', '/contacts',
];

// Sitemap статический: только разделы сайта. Страницы событий (/events/:id) сюда
// сознательно НЕ включаем: это CSR-страницы без пререндера — Яндекс (не исполняет JS)
// видит на них мету главной и группирует как дубли, пользы от записей нет; Google
// исполняет JS и находит события по внутренним ссылкам из списка. Если появится
// серверный рендер меты для /events/:id — события стоит вернуть (с lastmod).
const XML =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  STATIC_PATHS.map((p) => `  <url><loc>${ORIGIN}${p}</loc></url>`).join('\n') +
  '\n</urlset>\n';

export function getSitemap(_req: Request, res: Response): void {
  res.type('application/xml');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(XML);
}
