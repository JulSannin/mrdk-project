import { Link } from 'react-router-dom';
import type { Event } from '../types';
import { formatDate } from '../../shared/lib/dateHelpers';
import { truncate } from '../../shared/lib/stringHelpers';
import { BviImg } from '../../shared/bvi/BviImg';
import styles from './EventCard.module.css';

const MAX_DESCRIPTION_LENGTH = 116;

// load — как грузить изображение:
//   'lazy' (по умолчанию) — при прокрутке, как на главной;
//   'eager' — сразу, не дожидаясь прокрутки (все карточки на /events);
//   'priority' — сразу и с высоким приоритетом. Только для первой карточки списка: она
//   обычно LCP. Больше одной не ставить — на мобилке сетка в одну колонку, и соседние
//   «приоритетные» карточки оказались бы под сгибом, деля с ней канал.
// paused — список уже запросил другую страницу/год: недогруженная картинка обрывает
// загрузку, чтобы не занимать канал (подробности — у пропа paused в BviImg).
function EventCard({
  event,
  load = 'lazy',
  paused,
}: {
  event: Event;
  load?: 'lazy' | 'eager' | 'priority';
  paused?: boolean;
}) {
  return (
    <Link to={`/events/${event.id}`} className={styles['event-card-link']} viewTransition>
      <article id={`event-${event.id}`} className={styles['event-card']}>
        <div className={styles['event-card__image-wrap']}>
          <BviImg
            className={styles['event-card__image']}
            skeleton
            src={event.image_path ? `/${event.image_path}` : '/default.jpg'}
            alt={event.title}
            loading={load === 'lazy' ? 'lazy' : 'eager'}
            fetchPriority={load === 'priority' ? 'high' : undefined}
            paused={paused}
          />
        </div>
        {event.event_date ? (
          <time className={styles['event-card__date']} dateTime={event.event_date}>
            {formatDate(event.event_date)}
          </time>
        ) : (
          <span className={styles['event-card__date']}>—</span>
        )}
        <h2 className={styles['event-card__title']}>{event.title}</h2>
        <p className={styles['event-card__description']}>
          {truncate(event.description, MAX_DESCRIPTION_LENGTH)}
        </p>
      </article>
    </Link>
  );
}

export default EventCard;
