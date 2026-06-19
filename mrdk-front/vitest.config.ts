import { defineConfig } from 'vitest/config';

// Отдельный конфиг (не наследует vite.config.ts) — тестам dataProvider не нужен
// ни react-плагин, ни DOM: apiClient мокается, react-admin импортируется только
// как типы. Среда node достаточна и быстрее.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
