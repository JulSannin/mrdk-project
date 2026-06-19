// multer/busboy декодирует имя файла из multipart/form-data как latin1, из-за чего
// UTF-8 имена (кириллица) приходят «кракозяброй» (Ð¡ÐµÐ½Ñ‚ÑÐ±Ñ€Ñ вместо Сентябрь).
// Возвращаем исходную UTF-8 строку. Для чисто ASCII-имён round-trip — no-op.
export function decodeOriginalName(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8');
}
