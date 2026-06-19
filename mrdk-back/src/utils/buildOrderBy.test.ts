import { describe, it, expect } from 'vitest';
import { buildOrderBy } from './buildOrderBy.js';

const allowed = { id: 'id', title: 'title', event_date: 'event_date' };
const fallback = 'event_date DESC NULLS LAST, id DESC';

describe('buildOrderBy', () => {
  it('собирает ORDER BY для разрешённого поля с tie-break по id', () => {
    expect(buildOrderBy('title', 'ASC', allowed, fallback)).toBe('title ASC, id ASC');
    expect(buildOrderBy('event_date', 'desc', allowed, fallback)).toBe('event_date DESC, id DESC');
  });

  it('для сортировки по id не дублирует колонку', () => {
    expect(buildOrderBy('id', 'asc', allowed, fallback)).toBe('id ASC');
  });

  it('нормализует направление: всё кроме ASC → DESC', () => {
    expect(buildOrderBy('title', 'asc', allowed, fallback)).toBe('title ASC, id ASC');
    expect(buildOrderBy('title', 'whatever', allowed, fallback)).toBe('title DESC, id DESC');
    expect(buildOrderBy('title', undefined, allowed, fallback)).toBe('title DESC, id DESC');
  });

  it('поле вне whitelist → fallback (защита от SQL-инъекции)', () => {
    expect(buildOrderBy('title; DROP TABLE events;--', 'ASC', allowed, fallback)).toBe(fallback);
    expect(buildOrderBy('password', 'ASC', allowed, fallback)).toBe(fallback);
    expect(buildOrderBy(undefined, 'ASC', allowed, fallback)).toBe(fallback);
    expect(buildOrderBy(42, 'ASC', allowed, fallback)).toBe(fallback);
  });
});
