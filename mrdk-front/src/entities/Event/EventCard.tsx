import { Link } from 'react-router-dom';
import type { Event } from '../types';
import { formatDate } from '../../shared/lib/dateHelpers';
import { truncate } from '../../shared/lib/stringHelpers';
import { BviImg } from '../../shared/ui/BviImg';
import styles from './EventCard.module.css';

const MAX_DESCRIPTION_LENGTH = 116;

function EventCard({ event }: { event: Event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className={styles['event-card-link']}
      viewTransition
      aria-label={event.title}
    >
      <article id={`event-${event.id}`} className={styles['event-card']}>
        <div className={styles['event-card__image-wrap']}>
          {event.image_path && (
            <BviImg
              className={styles['event-card__image']}
              src={`/${event.image_path}`}
              alt={event.title}
              loading="lazy"
            />
          )}
        </div>
        <time className={styles['event-card__date']}>
          {formatDate(event.event_date)}
        </time>
        <h2 className={styles['event-card__title']}>{event.title}</h2>
        <p className={styles['event-card__description']}>
          {truncate(event.description, MAX_DESCRIPTION_LENGTH)}
        </p>
      </article>
    </Link>
  );
}

export default EventCard;