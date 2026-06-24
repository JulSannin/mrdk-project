import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Request, Response } from 'express';

// pool и logger мокаем целиком — реальный PG/winston не поднимается.
vi.mock('../config/db.js', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));
vi.mock('../config/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import pool from '../config/db.js';
import { getEvents, getEventYears, deleteEventMainImage } from './events.js';

const query = pool.query as unknown as Mock;

function mockRes() {
  const res = { json: vi.fn(), set: vi.fn(), status: vi.fn(), send: vi.fn() };
  res.status.mockReturnValue(res);
  res.set.mockReturnValue(res);
  return res as unknown as Response & { json: Mock; set: Mock; status: Mock; send: Mock };
}

beforeEach(() => { query.mockReset(); });

describe('getEvents', () => {
  it('возвращает { data, total } и ставит X-Total-Count', async () => {
    const rows = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
    query
      .mockResolvedValueOnce({ rows })                    // выборка строк
      .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // COUNT(*)
    const res = mockRes();
    const next = vi.fn();
    await getEvents({ query: {} } as unknown as Request, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('X-Total-Count', '2');
    expect(res.json).toHaveBeenCalledWith({ data: rows, total: 2 });
  });

  it('фильтр по году сдвигает плейсхолдеры на $2/$3', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });
    await getEvents({ query: { year: '2024' } } as unknown as Request, mockRes(), vi.fn());
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('WHERE EXTRACT(YEAR FROM event_date) = $1');
    expect(sql).toContain('LIMIT $2 OFFSET $3');
    expect(params).toEqual([2024, 12, 0]);       // year, дефолтный limit, offset
    expect(query.mock.calls[1][1]).toEqual([2024]); // COUNT с тем же годом
  });

  it('мусорный year игнорируется (без WHERE)', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });
    await getEvents({ query: { year: 'не-год' } } as unknown as Request, mockRes(), vi.fn());
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain('WHERE');
    expect(params).toEqual([12, 0]);
  });

  it('limit кап на 100, мусорные page/limit → дефолты', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });
    await getEvents({ query: { limit: '9999', page: '0' } } as unknown as Request, mockRes(), vi.fn());
    expect(query.mock.calls[0][1]).toEqual([100, 0]); // limit капнут до 100, page→1 ⇒ offset 0
  });

  it('ошибку БД отдаёт в next()', async () => {
    const err = new Error('db down');
    query.mockRejectedValueOnce(err);
    const next = vi.fn();
    await getEvents({ query: {} } as unknown as Request, mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('getEventYears', () => {
  it('возвращает список годов со счётчиком', async () => {
    const data = [{ year: 2024, count: 5 }, { year: 2023, count: 3 }];
    query.mockResolvedValueOnce({ rows: data });
    const res = mockRes();
    await getEventYears({} as Request, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith({ data });
  });
});

describe('deleteEventMainImage', () => {
  it('сбрасывает image_path в NULL и отвечает 204', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ image_path: 'uploads/events/x.jpg' }] }) // SELECT
      .mockResolvedValueOnce({ rows: [] });                                       // UPDATE
    const res = mockRes();
    await deleteEventMainImage({ params: { id: 5 } } as unknown as Request, res, vi.fn());
    expect(query.mock.calls[1][0]).toContain('UPDATE events SET image_path = NULL');
    expect(query.mock.calls[1][1]).toEqual([5]);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('несуществующее событие → 404, UPDATE не выполняется', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // SELECT пусто
    const res = mockRes();
    await deleteEventMainImage({ params: { id: 999 } } as unknown as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(query).toHaveBeenCalledTimes(1); // только SELECT, без UPDATE
  });
});
