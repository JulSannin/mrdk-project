import { describe, it, expect } from 'vitest';
import { parsePagination } from './parsePagination.js';

describe('parsePagination', () => {
  it('дефолты при пустом запросе', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 12, offset: 0 });
  });

  it('считает offset от страницы и лимита', () => {
    expect(parsePagination({ page: '3', limit: '20' })).toEqual({ page: 3, limit: 20, offset: 40 });
  });

  it('лимит капается сверху и снизу', () => {
    expect(parsePagination({ limit: '9999' }).limit).toBe(100);
    // '0' → parseInt даёт 0, оно ложно, поэтому подхватывается дефолт…
    expect(parsePagination({ limit: '0' }).limit).toBe(12);
    // …а '-5' истинно, дефолт не срабатывает и значение зажимается до 1.
    // Поведение унаследовано от прежнего кода в контроллерах и сохранено как есть.
    expect(parsePagination({ limit: '-5' }).limit).toBe(1);
  });

  it('мусорные значения падают в дефолты', () => {
    expect(parsePagination({ page: 'abc', limit: 'нет' })).toEqual({ page: 1, limit: 12, offset: 0 });
    expect(parsePagination({ page: '0' }).page).toBe(1);
  });

  // Регрессия: без потолка offset уходил в 1.2e21, pg отдавал его строкой
  // '1.2e+21', и Postgres валил запрос по bigint (22P02) → 500 на публичном URL.
  it('огромная страница обрезается потолком, offset остаётся безопасным числом', () => {
    const { page, offset } = parsePagination({ page: '99999999999999999999', limit: '100' });
    expect(page).toBe(1_000_000);
    expect(Number.isSafeInteger(offset)).toBe(true);
    expect(String(offset)).not.toMatch(/e\+/i); // никакой экспоненты в параметре для pg
  });
});
