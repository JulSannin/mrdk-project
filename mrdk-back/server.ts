import fs from 'fs';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');
  dotenv.default.config();
}

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_LOGIN'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Не заданы обязательные переменные окружения: ${missingEnv.join(', ')}`);
}

// Импортируем динамически (а не статически сверху файла) намеренно: эти модули читают
// process.env уже на этапе импорта (напр. config/db сразу создаёт пул из DATABASE_URL).
// Статический импорт выполнился бы ДО dotenv.config() и проверки переменных выше.
const { default: app } = await import('./src/app.js');
const { default: pool } = await import('./src/config/db.js');
const { default: logger } = await import('./src/config/logger.js');
const { runMigrations } = await import('./src/config/migrate.js');

await runMigrations(pool);

const exists = await pool.query(
  'SELECT id FROM users WHERE login = $1',
  [process.env.ADMIN_LOGIN]
);
if (exists.rows.length === 0) {
  const adminPassword = process.env.ADMIN_PASSWORD_FILE
    ? fs.readFileSync(process.env.ADMIN_PASSWORD_FILE, 'utf8').trim()
    : process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('Администратора нет в БД, а ADMIN_PASSWORD / ADMIN_PASSWORD_FILE не заданы — создать его не из чего');
  }

  const hash = await bcrypt.hash(adminPassword, 10);
  await pool.query(
    'INSERT INTO users (name, login, password_hash, role) VALUES ($1, $2, $3, $4)',
    ['Администратор', process.env.ADMIN_LOGIN, hash, 'admin']
  );
  logger.info('Администратор создан');
}

const PORT = process.env.PORT ?? 3001;
const server = app.listen(PORT, () => logger.info(`Сервер запущен на порту ${PORT}`));

async function shutdown(signal: string): Promise<void> {
  logger.info(`Получен ${signal} — останавливаюсь`);
  // 1) перестаём принимать новые соединения, ждём завершения текущих запросов
  server.close(async (err) => {
    if (err) {
      logger.error('Ошибка закрытия HTTP-сервера', { error: err.message });
      process.exit(1);
    }
    try {
      await pool.end();            // 2) корректно закрываем пул соединений с БД
      logger.info('Пул БД закрыт, выход');
      process.exit(0);
    } catch (e) {
      logger.error('Ошибка закрытия пула БД', { error: (e as Error).message });
      process.exit(1);
    }
  });

  // 3) страховка: если за 10 с не уложились — принудительный выход
  setTimeout(() => {
    logger.error('Graceful shutdown затянулся — принудительный выход');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
