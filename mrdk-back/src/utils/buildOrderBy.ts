// Безопасно собирает выражение ORDER BY из sort+order (формат react-admin).
// allowed — whitelist: имя поля из запроса -> SQL-колонка. Любое значение вне
// whitelist даёт fallback, поэтому SQL-инъекция невозможна.
export function buildOrderBy(
  sort: unknown,
  order: unknown,
  allowed: Record<string, string>,
  fallback: string,
): string {
  const col = typeof sort === 'string' ? allowed[sort] : undefined;
  if (!col) return fallback;
  const dir = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return col === 'id' ? `id ${dir}` : `${col} ${dir}, id ${dir}`;
}
