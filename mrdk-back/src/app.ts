import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { setupMorgan } from './config/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import eventsRouter from './routes/events.js';
import workplanRouter from './routes/workplan.js';
import documentsRouter from './routes/documents.js';
import remindersRouter from './routes/reminders.js';
import clubsRouter from './routes/clubs.js';
import feedbackRouter from './routes/feedback.js';

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : [];

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-eval'", "https://mc.yandex.ru", "https://mc.yandex.com", "https://maps.api.2gis.ru"],
            connectSrc: ["'self'", "https://mc.yandex.ru", "https://mc.yandex.com", "wss://mc.yandex.ru", "wss://mc.yandex.com", "https://yandex.ru", "https://maps.api.2gis.ru", "https://catalog.api.2gis.ru", "https://keys.api.2gis.com"],
            imgSrc: ["'self'", "data:", "https://mc.yandex.ru", "https://mc.yandex.com", "https://*.maps.2gis.com", "https://maps.api.2gis.ru"],
            frameSrc: (["https://map.2gis.com", "https://mc.yandex.ru", "https://mc.yandex.com", process.env.GOSUSLUGI_ORIGIN] as (string | undefined)[]).filter(Boolean) as string[],
            styleSrc: ["'self'", "'unsafe-inline'", "https://maps.api.2gis.ru"],
        },
    },
}));

app.use(cors({
    origin: (origin, callback) => {
        // origin отсутствует у same-origin и серверных запросов (curl, healthcheck) —
        // их пропускаем; браузерные кросс-доменные обязаны быть в whitelist (CLIENT_ORIGIN).
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            const err = new Error('Not allowed by CORS') as Error & { statusCode?: number };
            err.statusCode = 403;
            callback(err);
        }
    },
    credentials: true
}));

setupMorgan(app);
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);

app.use('/health', healthRouter);

app.use(generalLimiter);

if (process.env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static('uploads'));
}

app.use('/auth', authRouter);
app.use('/events', eventsRouter);
app.use('/workplan', workplanRouter);
app.use('/documents', documentsRouter);
app.use('/reminders', remindersRouter);
app.use('/clubs', clubsRouter);
app.use('/feedback', feedbackRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Not Found', statusCode: 404 } });
});

app.use(errorHandler);

export default app;