// Разбор ?page/?limit для списочных эндпоинтов (события, документы, план, памятки).
//
// Потолок страницы обязателен: без него parseInt('99999999999999999999') даёт 1e20,
// offset уходит в 1.2e21, и pg передаёт параметр строкой '1.2e+21' — Postgres не
// принимает экспоненциальную запись для bigint и валит запрос (22P02), то есть
// публичный эндпоинт отдаёт 500 на руками собранный URL. Реальных данных столько
// не бывает: 1e6 страниц по 100 записей — это 100 млн строк.
const MAX_PAGE = 1_000_000;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 12;

export function parsePagination(query: { page?: unknown; limit?: unknown }): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.min(MAX_PAGE, Math.max(1, parseInt(String(query.page)) || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(query.limit)) || DEFAULT_LIMIT));
  return { page, limit, offset: (page - 1) * limit };
}
