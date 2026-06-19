import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { validationResult } from 'express-validator';
import pool from '../config/db.js';
import logger from '../config/logger.js';
import { decodeOriginalName } from '../utils/decodeOriginalName.js';

export async function getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit)) || 12));
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      pool.query('SELECT id, title, original_name FROM documents ORDER BY created_at ASC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM documents'),
    ]);
    const total = parseInt(count.rows[0].count);
    res.set('X-Total-Count', String(total));
    res.json({ data: rows.rows, total });
  } catch (err) { next(err); }
}

export async function downloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    const rec = result.rows[0];
    const name = rec.original_name ?? 'file';
    const ascii = name.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    const encoded = encodeURIComponent(name);
    // filename — ASCII-фолбэк для старых клиентов, filename* — корректный UTF-8 для браузеров
    res.set('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`);
    res.sendFile(path.resolve(rec.document_path));
  } catch (err) { next(err); }
}

export async function createDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: { message: 'Файл обязателен', statusCode: 400 } }); return;
  }
  try {
    const { title } = req.body as { title: string };
    const result = await pool.query(
      'INSERT INTO documents (title, document_path, original_name) VALUES ($1, $2, $3) RETURNING *',
      [title, req.file.path, decodeOriginalName(req.file.originalname)]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    next(err);
  }
}

export async function updateDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const old = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    const rec = old.rows[0];
    const title = req.body.title ?? rec.title;
    const document_path = req.file ? req.file.path : rec.document_path;
    const original_name = req.file ? decodeOriginalName(req.file.originalname) : rec.original_name;
    const result = await pool.query(
      'UPDATE documents SET title=$1, document_path=$2, original_name=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [title, document_path, original_name, req.params.id]
    );
    if (req.file && rec.document_path) {
      fs.promises.unlink(rec.document_path)
        .catch(e => logger.error('Не удалось удалить файл', { path: rec.document_path, error: e.message }));
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    next(err);
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    const rec = result.rows[0];
    if (rec.document_path) {
      fs.promises.unlink(rec.document_path)
        .catch(e => logger.error('Не удалось удалить файл', { path: rec.document_path, error: e.message }));
    }
    res.json({ data: { id: rec.id } });
  } catch (err) { next(err); }
}