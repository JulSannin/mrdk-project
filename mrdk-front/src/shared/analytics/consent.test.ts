import { describe, it, expect, vi } from 'vitest';

// Согласие хранится в переменной уровня модуля, поэтому для каждого теста
// импортируем модуль заново. В node-среде localStorage нет — readConsent ловит
// ReferenceError и отдаёт false, то есть проверяется именно фолбэк на память.
async function fresh() {
  vi.resetModules();
  return import('./consent');
}

describe('consent', () => {
  it('по умолчанию согласия нет — Метрике стартовать не с чего', async () => {
    const { readConsent } = await fresh();
    expect(readConsent()).toBe(false);
  });

  it('acceptConsent переключает состояние', async () => {
    const { readConsent, acceptConsent } = await fresh();
    expect(readConsent()).toBe(false);
    acceptConsent();
    expect(readConsent()).toBe(true);
  });

  // Ради этого стор и заводился: без уведомления подписчиков Метрика включилась
  // бы только после перезагрузки страницы, а не по клику «Принять».
  it('будит подписчиков при согласии', async () => {
    const { subscribe, acceptConsent } = await fresh();
    const listener = vi.fn();
    subscribe(listener);
    acceptConsent();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('отписка работает', async () => {
    const { subscribe, acceptConsent } = await fresh();
    const listener = vi.fn();
    subscribe(listener)();
    acceptConsent();
    expect(listener).not.toHaveBeenCalled();
  });
});
