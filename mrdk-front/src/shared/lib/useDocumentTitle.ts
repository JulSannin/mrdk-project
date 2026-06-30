import { useEffect } from 'react';
import { useMatches } from 'react-router-dom';
import { SITE_NAME, SITE_DESCRIPTION } from '../config/siteMeta';

export { SITE_NAME };

// Запасное описание, если у роута не задано своё.
const DEFAULT_DESCRIPTION = SITE_DESCRIPTION;

const formatTitle = (page?: string | null) => (page ? `${page} — ${SITE_NAME}` : SITE_NAME);

// CSR-SPA: title и <meta name="description"> меняем в ЖИВОМ DOM на клиенте.
// ВАЖНО: «Просмотр исходного кода» (Ctrl+U) всегда показывает статичный index.html —
// для per-page мета в самом HTML нужен SSR/пререндер. Для вкладки браузера и
// JS-исполняющих краулеров (Google) этого достаточно.
function applyMeta(title: string, description?: string | null) {
  document.title = title;
  if (description == null) return;
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!el) {
    el = document.createElement('meta');
    el.name = 'description';
    document.head.appendChild(el);
  }
  el.content = description;
}

// Метаданные роута: { title: '<раздел>'|null, description?: '...' }.
// Роуты без ключа title (событие, /admin) сюда не попадают — мета ставит сама страница.
type RouteMetaHandle = { title: string | null; description?: string };
const hasTitle = (h: unknown): h is RouteMetaHandle =>
  typeof h === 'object' && h !== null && 'title' in h;

// Вызывается в RootLayout: ставит title + description из handle совпавшего роута.
export function useRouteMeta() {
  const matches = useMatches();
  useEffect(() => {
    const m = [...matches].reverse().find((x) => hasTitle(x.handle));
    if (!m) return; // событие/админка — выставляют мета сами
    const h = m.handle as RouteMetaHandle;
    applyMeta(formatTitle(h.title), h.description ?? DEFAULT_DESCRIPTION);
  }, [matches]);
}

// Для динамических страниц (напр. событие): title + description из загруженных данных.
export function useDocumentTitle(page?: string | null, description?: string | null) {
  useEffect(() => {
    applyMeta(formatTitle(page), description ?? null);
  }, [page, description]);
}
