import type { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

const ORIGIN = process.env.SITE_ORIGIN || 'https://nn-lance.ru';

// Статические индексируемые маршруты — держать синхронно с
// mrdk-front/src/shared/config/siteMeta.ts (STATIC_ROUTES).
const STATIC_PATHS = [
  '/', '/events', '/clubs', '/workplan', '/documents', '/reminders', '/anticorruption', '/contacts',
];

interface EventRow { id: number; lastmod: string | Date | null }

// Динамический sitemap.xml: статические разделы + URL всех событий (с lastmod).
export async function getSitemap(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const events = await pool.query<EventRow>(
      'SELECT id, COALESCE(updated_at, created_at) AS lastmod FROM events ORDER BY id',
    );
    const urls: string[] = [
      ...STATIC_PATHS.map((p) => `  <url><loc>${ORIGIN}${p}</loc></url>`),
      ...events.rows.map((e) => {
        const d = e.lastmod ? new Date(e.lastmod).toISOString().slice(0, 10) : null;
        return `  <url><loc>${ORIGIN}/events/${e.id}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`;
      }),
    ];
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      `${urls.join('\n')}\n` +
      '</urlset>\n';
    res.type('application/xml').send(xml);
  } catch (err) {
    next(err);
  }
}
