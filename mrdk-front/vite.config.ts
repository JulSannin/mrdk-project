import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { STATIC_ROUTES, SITE_NAME, SITE_ORIGIN } from './src/shared/config/siteMeta';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const titleOf = (t: string | null) => (t ? `${t} — ${SITE_NAME}` : SITE_NAME);

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
      for (const [path, meta] of Object.entries(STATIC_ROUTES)) {
        if (path === '/') continue; // главная = базовый index.html
        const title = titleOf(meta.title);
        const desc = escapeHtml(meta.description);
        const html = base
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
          .replace(/(<meta\s+name="description"\s+content=")[\s\S]*?(")/, `$1${desc}$2`)
          .replace(/(<meta\s+property="og:title"\s+content=")[\s\S]*?(")/, `$1${escapeHtml(title)}$2`)
          .replace(/(<meta\s+property="og:description"\s+content=")[\s\S]*?(")/, `$1${desc}$2`)
          .replace(/(<meta\s+property="og:url"\s+content=")[\s\S]*?(")/, `$1${escapeHtml(SITE_ORIGIN + path)}$2`);
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
  plugins: [react(), prerenderStaticRoutes()],
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
