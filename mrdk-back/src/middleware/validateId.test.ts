import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validateIdParam } from './validateId.js';

// validateIdParam = [ValidationChain, handler]. Цепочку прогоняем через .run(req)
// (официальный способ тестирования express-validator), затем зовём handler.
const [idChain, idHandler] = validateIdParam as unknown as [
  { run: (req: Request) => Promise<unknown> },
  (req: Request, res: Response, next: NextFunction) => void,
];

function mockRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

async function run(idValue: string) {
  const req = { params: { id: idValue } } as unknown as Request;
  await idChain.run(req);
  const res = mockRes();
  const next = vi.fn();
  idHandler(req, res, next);
  return { req, res, next };
}

describe('validateIdParam', () => {
  it('пропускает валидный id и приводит его к number (.toInt)', async () => {
    const { req, res, next } = await run('42');
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect((req.params as Record<string, unknown>).id).toBe(42);
  });

  it('нечисловой id → 400, next не вызывается (нет падения в Postgres)', async () => {
    const { res, next } = await run('abc');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Некорректный id', statusCode: 400 } });
    expect(next).not.toHaveBeenCalled();
  });

  it('id < 1 отклоняется', async () => {
    const { res, next } = await run('0');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
