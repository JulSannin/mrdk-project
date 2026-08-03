import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { validationResult } from 'express-validator';
import pool from '../config/db.js';
import logger from '../config/logger.js';
import { parsePagination } from '../utils/parsePagination.js';

export async function getReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { limit, offset } = parsePagination(req.query);
    const [rows, count] = await Promise.all([
      pool.query('SELECT id, title, image_path FROM reminders ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM reminders'),
    ]);
    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, total });
  } catch (err) { next(err); }
}

export async function getReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT id, title, image_path, created_at FROM reminders WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
}

export async function createReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  // Памятка без картинки не имеет смысла: на сайте это карточка-изображение,
  // которая по клику открывается во весь экран. Требуем файл так же, как
  // документы и план работы (см. documents.ts / workplan.ts).
  if (!req.file) {
    res.status(400).json({ error: { message: 'Изображение обязательно', statusCode: 400 } }); return;
  }
  try {
    const { title } = req.body as { title: string };
    const result = await pool.query(
      'INSERT INTO reminders (title, image_path) VALUES ($1, $2) RETURNING *',
      [title, req.file.path]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    next(err);
  }
}

export async function updateReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const old = await pool.query('SELECT * FROM reminders WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    const rec = old.rows[0];
    const title = req.body.title ?? rec.title;
    const image_path = req.file ? req.file.path : rec.image_path;
    const result = await pool.query(
      'UPDATE reminders SET title=$1, image_path=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [title, image_path, req.params.id]
    );
    if (req.file && rec.image_path) {
      fs.promises.unlink(rec.image_path)
        .catch(e => logger.error('Не удалось удалить файл', { path: rec.image_path, error: e.message }));
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    next(err);
  }
}

export async function deleteReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const result = await pool.query('DELETE FROM reminders WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    const rec = result.rows[0];
    if (rec.image_path) {
      fs.promises.unlink(rec.image_path)
        .catch(e => logger.error('Не удалось удалить файл', { path: rec.image_path, error: e.message }));
    }
    res.json({ data: { id: rec.id } });
  } catch (err) { next(err); }
}