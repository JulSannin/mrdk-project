import { MAP_EMBED_SRC } from './contactsMapData';
import styles from './ContactsMap.module.css';

// Карта — iframe Яндекс.Конструктора, грузится вместе со страницей.
//
// NB: в отличие от Метрики (shared/analytics/consent.ts, подключается только после
// «Принять») карта согласия на обработку ПД не ждёт — Яндекс узнаёт о посетителе
// с первого рендера страницы. Решение осознанное. Если понадобится иначе, самый
// дешёвый вариант — рендерить iframe по клику, а до клика показывать ссылку наружу.
//
// loading="lazy" — карта лежит внизу страницы, до неё ещё надо доскроллить.
export function ContactsMap({ fallbackHref }: { fallbackHref: string }) {
  // Пустой MAP_EMBED_SRC = карта выключена; ссылка наружу работает всегда.
  if (!MAP_EMBED_SRC) {
    return (
      <a className={styles.fallback} href={fallbackHref} target="_blank" rel="noopener noreferrer">
        <span aria-hidden="true">📍</span> Посмотреть на карте (Яндекс.Карты)
      </a>
    );
  }

  return (
    <iframe
      className={styles.map}
      src={MAP_EMBED_SRC}
      title="Карта с расположением учреждения и его филиалов"
      loading="lazy"
      allowFullScreen
    />
  );
}
