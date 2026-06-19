import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';

interface AppError extends Error {
    statusCode?: number;
    status?: number;
}

const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof multer.MulterError || err.message === 'INVALID_MIME') {
        res.status(400).json({ error: { message: err.message, statusCode: 400 } });
        return;
    }

    const status: number = err.statusCode || err.status || 500;

    if (status >= 500) {
        logger.error('Ошибка сервера', { error: err.message, stack: err.stack });
    }

    res.status(status).json({
        error: {
            message: status >= 500 ? 'Внутренняя ошибка сервера' : (err.message || 'Ошибка запроса'),
            statusCode: status,
        },
    });
};

export default errorHandler