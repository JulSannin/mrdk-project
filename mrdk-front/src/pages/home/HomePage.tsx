import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ApiList, Event } from '../../entities/types';
import apiClient from '../../shared/lib/apiClient';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import EventCard from '../../entities/Event/EventCard';
import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import styles from './HomePage.module.css';

// Сколько событий показывать на главной: мобилка — 4, планшет — 9, десктоп — 12.
// Брейкпоинты совпадают с остальной вёрсткой (768 / 1280).
function pickHomeEventsCount(): number {
  const w = window.innerWidth;
  if (w < 768) return 4;
  if (w < 1280) return 9;
  return 12;
}

export function HomePage() {
  const [count, setCount] = useState(pickHomeEventsCount);
  useEffect(() => {
    const onResize = () => setCount(pickHomeEventsCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['events', 'home', count],
    queryFn: () =>
      apiClient.get<ApiList<Event>>('/events', { params: { limit: count } }).then((r) => r.data),
  });

  return (
    <>
      <section className={styles.section}>
        <div className={styles.head}>
          <h1 className={styles.heading}>Последние события</h1>
          <Link to="/events" className={styles.allLink}>Все события →</Link>
        </div>

        {isError ? (
          <ErrorMessage onRetry={() => refetch()} />
        ) : (
          <ul className={styles.grid}>
            {isPending
              ? Array.from({ length: count }, (_, i) => (
                  <li key={i} className={styles.cardSkeleton} />
                ))
              : data.data.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                  </li>
                ))}
          </ul>
        )}
      </section>
      <ExternalLinkCards />
      <VideoBlock />
    </>
  );
}
