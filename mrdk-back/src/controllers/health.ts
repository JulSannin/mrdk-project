import type { Request, Response } from 'express';
import pool from '../config/db.js';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error' });
  }
}