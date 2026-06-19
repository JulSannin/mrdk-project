import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { validationResult } from 'express-validator';
import pool from '../config/db.js';
import logger from '../config/logger.js';
import { buildOrderBy } from '../utils/buildOrderBy.js';

export async function getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit)) || 12));
    const offset = (page - 1) * limit;
    // необязательный фильтр по году события (?year=2024); мусор игнорируем
    const yearRaw = parseInt(String(req.query.year));
    const year = Number.isInteger(yearRaw) && yearRaw >= 1970 && yearRaw <= 2100 ? yearRaw : null;
    const where = year ? 'WHERE EXTRACT(YEAR FROM event_date) = $1' : '';
    // публичный дефолт — по дате события (свежие сверху); админка шлёт sort+order
    const orderBy = buildOrderBy(req.query.sort, req.query.order,
      { id: 'id', title: 'title', event_date: 'event_date', created_at: 'created_at' },
      'event_date DESC NULLS LAST, id DESC');
    // при фильтре year занимает $1, поэтому limit/offset смещаются на $2/$3
    const li = year ? 2 : 1;
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT id, title, description, image_path, event_date, created_at FROM events ${where} ORDER BY ${orderBy} LIMIT $${li} OFFSET $${li + 1}`,
        year ? [year, limit, offset] : [limit, offset]),
      pool.query(`SELECT COUNT(*) FROM events ${where}`, year ? [year] : []),
    ]);
    const total = parseInt(count.rows[0].count);
    res.set('X-Total-Count', String(total));
    res.json({ data: rows.rows, total });
  } catch (err) { next(err); }
}

// Список годов, по которым есть события, со счётчиком — для фильтра на фронте.
export async function getEventYears(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT EXTRACT(YEAR FROM event_date)::int AS year, COUNT(*)::int AS count
       FROM events WHERE event_date IS NOT NULL
       GROUP BY year ORDER BY year DESC`);
    res.json({ data: result.rows });
  } catch (err) { next(err); }
}

export async function getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const [eventResult, imagesResult, videosResult] = await Promise.all([
      pool.query('SELECT id, title, description, image_path, event_date, created_at FROM events WHERE id = $1', [req.params.id]),
      pool.query('SELECT id, event_id, image_path, created_at FROM event_images WHERE event_id = $1 ORDER BY created_at ASC', [req.params.id]),
      pool.query('SELECT id, event_id, video_path, created_at FROM event_videos WHERE event_id = $1 ORDER BY created_at ASC', [req.params.id]),
    ]);
    if (eventResult.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    res.json({ data: { ...eventResult.rows[0], images: imagesResult.rows, videos: videosResult.rows } });
  } catch (err) { next(err); }
}

export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: { message: 'Файл изображения обязателен', statusCode: 400 } });
    return;
  }
  try {
    const { title, description, eventDate } = req.body as { title: string; description?: string; eventDate: string };
    const result = await pool.query(
      'INSERT INTO events (title, description, event_date, image_path) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description ?? null, eventDate, req.file?.path ?? null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    next(err);
  }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const old = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    const rec = old.rows[0];
    const title = req.body.title ?? rec.title;
    const description = req.body.description !== undefined ? req.body.description : rec.description;
    const event_date = req.body.eventDate ?? rec.event_date;
    const image_path = req.file ? req.file.path : rec.image_path;
    const result = await pool.query(
      'UPDATE events SET title=$1, description=$2, event_date=$3, image_path=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [title, description, event_date, image_path, req.params.id]
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

export async function addEventImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  const files = req.files as Express.Multer.File[];
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (files) for (const f of files) await fs.promises.unlink(f.path).catch(() => {});
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  if (!files || files.length === 0) {
    res.status(400).json({ error: { message: 'Файлы не переданы', statusCode: 400 } });
    return;
  }
  const client = await pool.connect();
  try {
    const eventCheck = await client.query('SELECT id FROM events WHERE id = $1', [req.params.id]);
    if (eventCheck.rows.length === 0) {
      for (const f of files) await fs.promises.unlink(f.path).catch(() => {});
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } });
      return;
    }
    await client.query('BEGIN');
    const inserted = [];
    for (const f of files) {
      const r = await client.query(
        'INSERT INTO event_images (event_id, image_path) VALUES ($1, $2) RETURNING *',
        [req.params.id, f.path]
      );
      inserted.push(r.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ data: inserted });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    for (const f of files) await fs.promises.unlink(f.path).catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

export async function deleteEventImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
      return;
    }
    const result = await pool.query(
      'DELETE FROM event_images WHERE id = $1 AND event_id = $2 RETURNING *',
      [req.params.imageId, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    const rec = result.rows[0];
    if (rec.image_path) {
      fs.promises.unlink(rec.image_path)
        .catch(e => logger.error('Не удалось удалить файл', { path: rec.image_path, error: e.message }));
    }
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function addEventVideos(req: Request, res: Response, next: NextFunction): Promise<void> {
  const files = req.files as Express.Multer.File[];
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (files) for (const f of files) await fs.promises.unlink(f.path).catch(() => {});
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  if (!files || files.length === 0) {
    res.status(400).json({ error: { message: 'Файлы не переданы', statusCode: 400 } });
    return;
  }
  const client = await pool.connect();
  try {
    const eventCheck = await client.query('SELECT id FROM events WHERE id = $1', [req.params.id]);
    if (eventCheck.rows.length === 0) {
      for (const f of files) await fs.promises.unlink(f.path).catch(() => {});
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } });
      return;
    }
    await client.query('BEGIN');
    const inserted = [];
    for (const f of files) {
      const r = await client.query(
        'INSERT INTO event_videos (event_id, video_path) VALUES ($1, $2) RETURNING *',
        [req.params.id, f.path]
      );
      inserted.push(r.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ data: inserted });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    for (const f of files) await fs.promises.unlink(f.path).catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

export async function deleteEventVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
      return;
    }
    const result = await pool.query(
      'DELETE FROM event_videos WHERE id = $1 AND event_id = $2 RETURNING *',
      [req.params.videoId, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    const rec = result.rows[0];
    if (rec.video_path) {
      fs.promises.unlink(rec.video_path)
        .catch(e => logger.error('Не удалось удалить файл', { path: rec.video_path, error: e.message }));
    }
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    // Пути галереи читаем до DELETE: строки event_images удалит каскад,
    // а файлы на диске иначе останутся сиротами.
    const [gallery, videos] = await Promise.all([
      pool.query('SELECT image_path FROM event_images WHERE event_id = $1', [req.params.id]),
      pool.query('SELECT video_path FROM event_videos WHERE event_id = $1', [req.params.id]),
    ]);
    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } });
      return;
    }
    const rec = result.rows[0];
    const paths: string[] = [
      rec.image_path,
      ...gallery.rows.map(r => r.image_path),
      ...videos.rows.map(r => r.video_path),
    ].filter(Boolean);
    for (const p of paths) {
      fs.promises.unlink(p)
        .catch(e => logger.error('Не удалось удалить файл', { path: p, error: e.message }));
    }
    res.json({ data: { id: rec.id } });
  } catch (err) {
    next(err);
  }
}