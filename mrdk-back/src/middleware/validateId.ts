import { param, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

// Валидация параметра :id для маршрутов вида /resource/:id.
// Без неё нечисловой id (`/events/abc`) уходит в запрос `WHERE id = $1` и падает
// в Postgres (22P02) → 500 + шум в логах. Здесь отдаём чистый 400 ДО запроса.
// Self-contained: сам возвращает 400, не зависит от того, чекает ли контроллер
// validationResult. `.toInt()` приводит валидный id к числу.
export const validateIdParam = [
  param('id').isInt({ min: 1 }).toInt(),
  (req: Request, res: Response, next: NextFunction): void => {
    if (!validationResult(req).isEmpty()) {
      res.status(400).json({ error: { message: 'Некорректный id', statusCode: 400 } });
      return;
    }
    next();
  },
];
