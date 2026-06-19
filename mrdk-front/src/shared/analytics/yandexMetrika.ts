// Яндекс.Метрика для SPA. Счётчик инициализируется один раз, а просмотры страниц
// шлём вручную на каждой смене маршрута (см. useYandexMetrika) — иначе в одностраничном
// приложении Метрика засчитала бы только первую загрузку.
//
// Номер счётчика берётся из VITE_YM_COUNTER_ID. Если он не задан — метрика выключена
// (ничего не грузится), поэтому в dev/без счётчика всё работает как обычно.
// CSP бэка уже разрешает mc.yandex.ru (app.ts → scriptSrc/connectSrc/imgSrc).

type YmFunction = ((...args: unknown[]) => void) & { a?: unknown[]; l?: number };

declare global {
  interface Window {
    ym?: YmFunction;
  }
}

const COUNTER_ID = Number(import.meta.env.VITE_YM_COUNTER_ID) || 0;
const TAG_URL = 'https://mc.yandex.ru/metrika/tag.js';

// Ставит заглушку ym (она копит вызовы в очередь) и подгружает tag.js один раз.
function ensureStub(): void {
  if (window.ym) return;
  const stub: YmFunction = function (...args: unknown[]) {
    (stub.a = stub.a || []).push(args);
  };
  stub.l = Date.now();
  window.ym = stub;

  if (!Array.from(document.scripts).some((s) => s.src === TAG_URL)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = TAG_URL;
    document.head.appendChild(script);
  }
}

let inited = false;

export function initYandexMetrika(): void {
  if (inited || !COUNTER_ID) return;
  inited = true;
  ensureStub();
  window.ym?.(COUNTER_ID, 'init', {
    defer: true, // первый просмотр шлём вручную из роутинга, чтобы не задвоить
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
  });
}

export function trackPageView(url: string): void {
  if (!COUNTER_ID) return;
  window.ym?.(COUNTER_ID, 'hit', url);
}
