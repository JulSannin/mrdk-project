import { Link } from 'react-router-dom';
import type { Event } from '../types';
import { formatDate } from '../../shared/lib/dateHelpers';
import { truncate } from '../../shared/lib/stringHelpers';
import { BviImg } from '../../shared/bvi/BviImg';
import styles from './EventCard.module.css';

const MAX_DESCRIPTION_LENGTH = 116;

// priority — для карточек «над сгибом» (первый ряд на главной / первой странице):
// изображение грузим сразу и с высоким приоритетом, остальные — лениво. Это убирает
// задержку LCP (первая карточка — обычно самый крупный элемент первого экрана).
// paused — список уже запросил другую страницу/год: недогруженная картинка обрывает
// загрузку, чтобы не занимать канал (подробности — у пропа paused в BviImg).
function EventCard({
  event,
  priority = false,
  paused,
}: {
  event: Event;
  priority?: boolean;
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
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
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
