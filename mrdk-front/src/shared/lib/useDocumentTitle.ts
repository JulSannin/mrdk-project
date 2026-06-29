import { useEffect } from 'react';
import { useMatches } from 'react-router-dom';

export const SITE_NAME = 'Мариинский районный дом культуры';

const format = (page?: string | null) => (page ? `${page} — ${SITE_NAME}` : SITE_NAME);

// Метаданные роута: { title: '<раздел>' } или { title: null } (= только имя сайта).
// Роуты БЕЗ ключа title (страница события, /admin) сюда не попадают — там title
// выставляет сама страница (useDocumentTitle) или react-admin.
type RouteTitleHandle = { title: string | null };
const hasTitle = (h: unknown): h is RouteTitleHandle =>
  typeof h === 'object' && h !== null && 'title' in h;

// Вызывается один раз в RootLayout: ставит document.title из handle совпавшего роута.
export function useRouteTitle() {
  const matches = useMatches();
  useEffect(() => {
    const m = [...matches].reverse().find((x) => hasTitle(x.handle));
    if (m) document.title = format((m.handle as RouteTitleHandle).title);
    // если title нет ни у одного матча — не трогаем (ставит сама страница/админка)
  }, [matches]);
}

// Для динамических страниц (напр. событие): title из загруженных данных.
export function useDocumentTitle(page?: string | null) {
  useEffect(() => {
    document.title = format(page);
  }, [page]);
}
