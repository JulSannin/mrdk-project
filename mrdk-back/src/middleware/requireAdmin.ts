import type { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ error: { message: 'Доступ запрещён', statusCode: 403 } });
        return;
    }
    next();
};