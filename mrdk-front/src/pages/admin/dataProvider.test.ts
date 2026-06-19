// Дату нормализуем через локальные методы Date — фиксируем TZ, чтобы
// '...T..Z' не «уехал» на сутки в CI с другим часовым поясом.
process.env.TZ = 'UTC';

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../../shared/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import apiClient from '../../shared/lib/apiClient';
import { dataProvider } from './dataProvider';

const get = apiClient.get as unknown as Mock;
const del = apiClient.delete as unknown as Mock;

type Params = Record<string, unknown>;
type Row = Record<string, unknown>;
// В рантайме типы стёрты — приводим к удобной для теста сигнатуре.
const dp = dataProvider as unknown as {
  getList: (r: string, p: Params) => Promise<{ data: Row[]; total: number }>;
  getOne: (r: string, p: Params) => Promise<{ data: Row }>;
  delete: (r: string, p: Params) => Promise<{ data: Row }>;
};

beforeEach(() => { vi.clearAllMocks(); });

describe('dataProvider.getList', () => {
  it('events: пробрасывает page/limit + сортировку и нормализует event_date → eventDate', async () => {
    get.mockResolvedValueOnce({
      data: { data: [{ id: 1, title: 'X', event_date: '2024-05-01T10:00:00.000Z' }], total: 1 },
    });
    const res = await dp.getList('events', {
      pagination: { page: 2, perPage: 12 },
      sort: { field: 'event_date', order: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith('/events', {
      params: { page: 2, limit: 12, sort: 'event_date', order: 'DESC' },
    });
    expect(res.total).toBe(1);
    expect(res.data[0].eventDate).toBe('2024-05-01');
  });

  it('clubs: не шлёт сортировку по столбцу, total = длине массива', async () => {
    get.mockResolvedValueOnce({ data: { data: [{ id: 1 }, { id: 2 }, { id: 3 }] } });
    const res = await dp.getList('clubs', {
      pagination: { page: 1, perPage: 12 },
      sort: { field: 'name', order: 'ASC' },
    });
    expect(get).toHaveBeenCalledWith('/clubs', { params: {} });
    expect(res.total).toBe(3);
    expect(res.data).toHaveLength(3);
  });
});

describe('dataProvider.getOne', () => {
  it('documents (download-ресурс): берёт запись из списка limit=100', async () => {
    get.mockResolvedValueOnce({ data: { data: [{ id: 5, title: 'Doc5' }, { id: 6, title: 'Doc6' }] } });
    const res = await dp.getOne('documents', { id: 6 });
    expect(get).toHaveBeenCalledWith('/documents', { params: { page: 1, limit: 100 } });
    expect(res.data.id).toBe(6);
  });
});

describe('dataProvider.delete', () => {
  it('дёргает DELETE и возвращает previousData', async () => {
    del.mockResolvedValueOnce({});
    const res = await dp.delete('events', { id: 9, previousData: { id: 9, title: 'old' } });
    expect(del).toHaveBeenCalledWith('/events/9');
    expect(res.data).toEqual({ id: 9, title: 'old' });
  });
});
