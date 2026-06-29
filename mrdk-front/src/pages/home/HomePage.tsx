import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ApiList, Event } from '../../entities/types';
import apiClient from '../../shared/lib/apiClient';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import EventCard from '../../entities/Event/EventCard';
import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import styles from './HomePage.module.css';
import uiStyles from '../../shared/ui/ui.module.css';

const MAX_CARDS = 20;

function cardsForColumns(cols: number): number {
  if (cols <= 1) return 4;
  if (cols === 2) return window.innerWidth <= 767 ? 4 : 8;
  if (cols === 3) return window.innerWidth < 1280 ? 9 : 12;
  return cols * 4;
}

export function HomePage() {

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['events', 'home'],
    queryFn: () =>
      apiClient.get<ApiList<Event>>('/events', { params: { limit: MAX_CARDS } }).then((r) => r.data),
  });

  const [visible, setVisible] = useState(4);
  const roRef = useRef<ResizeObserver | null>(null);

  const measureGrid = useCallback((el: HTMLUListElement | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    const update = () => {
      const cols = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      setVisible(cardsForColumns(cols));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    roRef.current = ro;
  }, []);

  useEffect(() => () => roRef.current?.disconnect(), []);

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
          <ul
            ref={measureGrid}
            key={isPending ? 'skeleton' : 'content'}
            className={`${styles.grid} ${isPending ? '' : uiStyles.fadeIn}`}
          >
            {isPending
              ? Array.from({ length: visible }, (_, i) => (
                  <li key={i} className={uiStyles.cardSkeleton} />
                ))
              : data.data.slice(0, visible).map((event, i) => (
                  <li key={event.id}>
                    {/* первый ряд (до 4 колонок) грузим приоритетно — это ускоряет LCP */}
                    <EventCard event={event} priority={i < 4} />
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
