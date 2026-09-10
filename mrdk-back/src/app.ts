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
import { getSitemap } from './controllers/sitemap.js';

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : [];

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // Держать синхронно с CSP в nginx/nginx.conf (там главный — он действует
            // на страницу, здесь только ответы API). Карта — iframe Яндекс.Конструктора,
            // поэтому от неё нужен лишь frame-src; 'unsafe-eval' убран вместе с 2ГИС.
            scriptSrc: ["'self'", "https://mc.yandex.ru", "https://mc.yandex.com"],
            connectSrc: ["'self'", "https://mc.yandex.ru", "https://mc.yandex.com", "wss://mc.yandex.ru", "wss://mc.yandex.com", "https://yandex.ru"],
            imgSrc: ["'self'", "data:", "https://mc.yandex.ru", "https://mc.yandex.com"],
            frameSrc: (["https://yandex.ru", "https://mc.yandex.ru", "https://mc.yandex.com", process.env.GOSUSLUGI_ORIGIN] as (string | undefined)[]).filter(Boolean) as string[],
            styleSrc: ["'self'", "'unsafe-inline'"],
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

// Статика загрузок (только dev; в проде /uploads отдаёт nginx) — ДО лимитера,
// иначе каждая картинка считается в rate-limit: при активных обновлениях дев
// упирается в 100/60с и отдаёт 429 на всё (данные и картинки) → «зависание».
if (process.env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static('uploads'));
}

app.use(generalLimiter);

// Статический XML из константы (см. controllers/sitemap.ts) — лимитер ему не мешает.
app.get('/sitemap.xml', getSitemap);

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