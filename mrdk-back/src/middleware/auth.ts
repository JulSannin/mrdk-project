import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

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

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
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

    try {
        const payload = jwt.verify(token, JWT_SECRET) as {
            userId: number,
            role: string,
            exp: number
        };

        // Скользящая сессия: если до истечения токена осталось ≤15 мин (900 с) — тихо
        // выдаём свежий на 2 ч, чтобы активный админ не разлогинился посреди работы.
        const remaining = payload.exp - Math.floor(Date.now() / 1000);
        if (remaining <= 900) {
            const newToken = jwt.sign(
                {
                    userId: payload.userId,
                    role: payload.role
                },
                JWT_SECRET,
                { expiresIn: '2h' }
            );
            res.cookie('token', newToken, cookieOptions);
        }

        req.user = {
            userId: payload.userId,
            role: payload.role
        }
        next();
    } catch {
        res.status(401).json({ error: { message: 'Неавторизован', statusCode: 401 } });
    }
};