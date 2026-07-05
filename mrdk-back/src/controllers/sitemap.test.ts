import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { STATIC_PATHS } from './sitemap.js';

// STATIC_PATHS обязан совпадать с ключами STATIC_ROUTES фронта: иначе новый раздел
// сайта молча не попадает в sitemap (или sitemap рекламирует удалённый — soft-404).
// Импортировать фронтовый модуль напрямую нельзя (другой пакет/tsconfig), поэтому
// ключи достаём из исходника регуляркой. Тест ломается и при переезде файла — это
// сигнал обновить путь и комментарий в sitemap.ts, а не удалить тест.
const FRONT_SITE_META = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../mrdk-front/src/shared/config/siteMeta.ts',
);

describe('sitemap STATIC_PATHS', () => {
  it('совпадает с ключами STATIC_ROUTES во фронте', () => {
    const src = readFileSync(FRONT_SITE_META, 'utf8');
    const block = src.match(/STATIC_ROUTES[^=]*=\s*\{([\s\S]*?)\n\};/);
    expect(block, 'в siteMeta.ts не найден объект STATIC_ROUTES').not.toBeNull();
    const frontPaths = [...block![1].matchAll(/^\s*'(\/[^']*)':/gm)].map((m) => m[1]);
    expect(frontPaths.length).toBeGreaterThan(0);
    expect([...STATIC_PATHS].sort()).toEqual([...frontPaths].sort());
  });
});
