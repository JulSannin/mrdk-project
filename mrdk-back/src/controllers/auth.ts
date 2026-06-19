import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import pool from '../config/db.js';
import { cookieOptions } from '../middleware/auth.js';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const { login, password } = req.body as { login: string; password: string };
    const result = await pool.query(
      'SELECT id, name, role, password_hash FROM users WHERE login = $1',
      [login]
    );
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      res.status(401).json({ error: { message: 'Неверный логин или пароль', statusCode: 401 } });
      return;
    }
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '2h' }
    );
    res.cookie('token', token, cookieOptions);
    res.json({ data: { user: { name: user.name } } });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('token', cookieOptions);
  res.json({ success: true });
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      'SELECT name, role FROM users WHERE id = $1',
      [req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: { message: 'Пользователь не найден', statusCode: 401 } });
      return;
    }
    res.json({ data: { user: result.rows[0] } });
  } catch (err) {
    next(err);
  }
}