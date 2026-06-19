import winston from 'winston';
import morgan from 'morgan';
import type { Application } from 'express';

const isDev = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
  transports: [new winston.transports.Console()],
});

export function setupMorgan(app: Application): void {
  const format = isDev ? 'dev' : 'combined';
  app.use(morgan(format, {
    stream: { write: (msg) => logger.info(msg.trimEnd()) },
  }));
}

export default logger;