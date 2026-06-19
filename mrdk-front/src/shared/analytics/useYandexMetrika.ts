import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initYandexMetrika, trackPageView } from './yandexMetrika';

export function useYandexMetrika(): void {
  const location = useLocation();

  useEffect(() => {
    initYandexMetrika();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
}
