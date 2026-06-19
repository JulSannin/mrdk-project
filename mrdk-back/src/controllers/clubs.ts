import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import pool from '../config/db.js';

export async function getClubs(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query('SELECT id, name, leader FROM clubs ORDER BY name ASC');
    res.json({ data: result.rows });
  } catch (err) { next(err); }
}

export async function getClub(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const result = await pool.query('SELECT id, name, leader FROM clubs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
}

export async function createClub(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const { name, leader } = req.body as { name: string; leader?: string };
    const result = await pool.query(
      'INSERT INTO clubs (name, leader) VALUES ($1, $2) RETURNING *',
      [name, leader ?? null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) { next(err); }
}

export async function updateClub(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const old = await pool.query('SELECT * FROM clubs WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    const rec = old.rows[0];
    const name = req.body.name ?? rec.name;
    const leader = req.body.leader !== undefined ? req.body.leader : rec.leader;
    const result = await pool.query(
      'UPDATE clubs SET name=$1, leader=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [name, leader, req.params.id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
}

export async function deleteClub(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const result = await pool.query('DELETE FROM clubs WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: { message: 'Не найдено', statusCode: 404 } }); return;
    }
    res.json({ data: { id: result.rows[0].id } });
  } catch (err) { next(err); }
}