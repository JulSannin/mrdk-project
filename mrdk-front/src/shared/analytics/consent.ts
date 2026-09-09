import { useSyncExternalStore } from 'react';

// Согласие на обработку ПД. Общий стор, а не состояние внутри баннера: на него
// подписана аналитика, которая до согласия не должна грузиться и обязана
// стартовать сразу по нажатию «Принять», без перезагрузки страницы.

const STORAGE_KEY = 'pdConsentAccepted';

// Фолбэк на случай недоступного localStorage (приватный режим, политики):
// согласие тогда действует до конца сессии, а не теряется сразу.
let memoryConsent = false;

const listeners = new Set<() => void>();

export function readConsent(): boolean {
  if (memoryConsent) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function acceptConsent(): void {
  memoryConsent = true;
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // storage недоступен — согласие живёт до конца сессии (см. memoryConsent)
  }
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useConsent(): boolean {
  return useSyncExternalStore(subscribe, readConsent);
}
