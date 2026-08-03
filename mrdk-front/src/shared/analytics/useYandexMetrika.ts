import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initYandexMetrika, trackPageView } from './yandexMetrika';
import { useConsent } from './consent';

// Без согласия не грузится вообще ничего: скрипт Метрики не подключается и хиты
// не отправляются. После нажатия «Принять» стор обновляется, эффекты ниже
// отрабатывают в порядке объявления — сначала init, затем первый хит текущей
// страницы, так что переход не теряется и перезагрузка не нужна.
export function useYandexMetrika(): void {
  const location = useLocation();
  const consent = useConsent();

  useEffect(() => {
    if (!consent) return;
    initYandexMetrika();
  }, [consent]);

  useEffect(() => {
    if (!consent) return;
    trackPageView(location.pathname + location.search);
  }, [consent, location.pathname, location.search]);
}
