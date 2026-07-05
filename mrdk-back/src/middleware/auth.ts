import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import logger from '../config/logger.js';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: {
                userId: number;
                role: string
            };
        }
    }
}

export const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 7200 * 1000,
    secure: process.env.NODE_ENV === 'production',
};

// Абсолютный потолок сессии: скользящее продление не тянется дольше суток с момента
// логина — украденная кука не живёт вечно, дальше нужен новый логин.
const MAX_SESSION_S = 24 * 60 * 60;

interface TokenPayload {
    userId: number;
    role: string;
    exp: number;
    /** unix-время первоначального логина; переносится в каждый продлённый токен */
    sess?: number;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?.token;

    if (!token) {
        res.status(401).json({
            error: {
                message: 'Неавторизован',
                statusCode: 401
            }
        });
        return;
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new Error('JWT_SECRET не задан');

    let payload: TokenPayload;
    try {
        payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
        res.status(401).json({ error: { message: 'Неавторизован', statusCode: 401 } });
        return;
    }

    // Скользящая сессия: если до истечения токена осталось ≤15 мин (900 с) — тихо
    // выдаём свежий на 2 ч, чтобы активный админ не разлогинился посреди работы.
    // Продление НЕ бесконечное: раз в ~1ч45м сверяемся с БД (пользователя могли
    // удалить, роль — сменить) и соблюдаем потолок сессии MAX_SESSION_S.
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - now <= 900) {
        const sess = payload.sess ?? now; // токен старого формата без sess: отсчёт от текущего момента
        if (now - sess <= MAX_SESSION_S) {
            try {
                const u = await pool.query('SELECT role FROM users WHERE id = $1', [payload.userId]);
                if (u.rows.length === 0) {
                    // пользователя больше нет — не продлеваем и не пускаем
                    res.status(401).json({ error: { message: 'Неавторизован', statusCode: 401 } });
                    return;
                }
                payload.role = u.rows[0].role; // роль берём свежую из БД
                const newToken = jwt.sign(
                    { userId: payload.userId, role: payload.role, sess },
                    JWT_SECRET,
                    { expiresIn: '2h' }
                );
                res.cookie('token', newToken, cookieOptions);
            } catch (err) {
                // БД недоступна: токен ещё валиден, запрос не роняем —
                // просто пропускаем продление, кука доживёт свой срок
                logger.warn('Продление сессии пропущено (БД недоступна)', { error: (err as Error).message });
            }
        }
        // потолок исчерпан: токен доживает свои ≤15 мин, дальше — новый логин
    }

    req.user = {
        userId: payload.userId,
        role: payload.role
    }
    next();
};