import fs from 'fs';
import path from 'path';
import type { Pool } from 'pg';
import logger from './logger.js';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

/**
 * Применяет SQL-миграции из папки migrations/ по порядку имени файла.
 * Каждая миграция выполняется в транзакции и фиксируется в таблице
 * schema_migrations, поэтому повторно не применяется. В отличие от
 * однократного init.sql это даёт корректную эволюцию схемы (ALTER и т.п.).
 */
export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = new Set<string>(
    (await pool.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info(`Миграция применена: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}
