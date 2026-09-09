import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { STATIC_ROUTES, SITE_ORIGIN, formatTitle } from './src/shared/config/siteMeta';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// %SITE_ORIGIN% в index.html (og:url, og:image) → домен из siteMeta.ts — единственный
// источник домена во фронте. Работает и в dev, и в build.
function injectSiteOrigin(): Plugin {
  return {
    name: 'inject-site-origin',
    transformIndexHtml: (html) => html.replaceAll('%SITE_ORIGIN%', SITE_ORIGIN),
  };
}

// Подмена обязана состояться: молчаливый no-op у String.replace означал бы, что
// страница уедет в прод с метой главной. Изменилась разметка меты в index.html —
// сборка должна УПАСТЬ, а не «успешно» сгенерировать одинаковые страницы.
const replaceOrThrow = (html: string, re: RegExp, replacement: string, what: string): string => {
  if (!re.test(html)) {
    throw new Error(`[prerender] в index.html не найден ${what} — разметка меты изменилась?`);
  }
  return html.replace(re, replacement);
};

// После сборки кладёт для каждого ИНДЕКСИРУЕМОГО маршрута свой dist/<route>/index.html
// с подменёнными <title> / <meta description> / og — чтобы Яндекс (не исполняет JS) видел
// per-page мету. Главная (/) = базовый dist/index.html. На сервере: nginx
// try_files $uri $uri/index.html /index.html (отдаёт пререндер, иначе SPA-фолбэк).
function prerenderStaticRoutes(): Plugin {
  return {
    name: 'prerender-static-routes',
    apply: 'build',
    closeBundle() {
      const dist = join(process.cwd(), 'dist');
      const base = readFileSync(join(dist, 'index.html'), 'utf8');
      let count = 0;
      // robots.txt генерируется здесь же: Sitemap-ссылка берётся из SITE_ORIGIN,
      // а не хардкодится отдельным файлом в public/ (иначе домен живёт в двух местах).
      writeFileSync(
        join(dist, 'robots.txt'),
        `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /api/\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
      );
      for (const [path, meta] of Object.entries(STATIC_ROUTES)) {
        if (path === '/') continue; // главная = базовый index.html
        const title = formatTitle(meta.title);
        const desc = escapeHtml(meta.description);
        let html = base;
        html = replaceOrThrow(
          html,
          /<title>[\s\S]*?<\/title>/,
          `<title>${escapeHtml(title)}</title>`,
          '<title>',
        );
        html = replaceOrThrow(
          html,
          /(<meta\s+name="description"\s+content=")[\s\S]*?(")/,
          `$1${desc}$2`,
          'meta description',
        );
        html = replaceOrThrow(
          html,
          /(<meta\s+property="og:title"\s+content=")[\s\S]*?(")/,
          `$1${escapeHtml(title)}$2`,
          'og:title',
        );
        html = replaceOrThrow(
          html,
          /(<meta\s+property="og:description"\s+content=")[\s\S]*?(")/,
          `$1${desc}$2`,
          'og:description',
        );
        html = replaceOrThrow(
          html,
          /(<meta\s+property="og:url"\s+content=")[\s\S]*?(")/,
          `$1${escapeHtml(SITE_ORIGIN + path)}$2`,
          'og:url',
        );
        const dir = join(dist, path);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'index.html'), html);
        count++;
      }
      console.log(`[prerender] сгенерировано ${count} статических страниц`);
    },
  };
}

export default defineConfig({
  plugins: [react(), injectSiteOrigin(), prerenderStaticRoutes()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
