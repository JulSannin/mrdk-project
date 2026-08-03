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
import { createReminder } from './reminders.js';

const query = pool.query as unknown as Mock;

function mockRes() {
  const res = { json: vi.fn(), set: vi.fn(), status: vi.fn(), send: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { json: Mock; status: Mock };
}

beforeEach(() => { query.mockReset(); });

describe('createReminder', () => {
  // Памятка без картинки — карточка-заглушка на сайте и битый попап, поэтому
  // файл обязателен так же, как у документов и плана работы.
  it('без файла → 400, в БД ничего не пишется', async () => {
    const res = mockRes();
    await createReminder({ body: { title: 'Памятка' } } as unknown as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Изображение обязательно', statusCode: 400 },
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('с файлом → 201 и путь уходит в image_path', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Памятка' }] });
    const res = mockRes();
    await createReminder(
      { body: { title: 'Памятка' }, file: { path: 'uploads/reminders/x.jpg' } } as unknown as Request,
      res,
      vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(query.mock.calls[0][1]).toEqual(['Памятка', 'uploads/reminders/x.jpg']);
  });
});
