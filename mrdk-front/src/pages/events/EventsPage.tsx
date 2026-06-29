import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { ApiList, Event } from '../../entities/types';
import apiClient from '../../shared/lib/apiClient';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import EventCard from '../../entities/Event/EventCard';
import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import ReactPaginate from '../../shared/lib/reactPaginate';
import styles from './EventsPage.module.css';
import uiStyles from '../../shared/ui/ui.module.css';

const LIMIT = 24;

interface EventYear {
  year: number;
  count: number;
}

export function EventsPage() {
  // номер страницы и выбранный год живут в URL (?year=2024&page=2) — ссылка шарится, работают назад/вперёд
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const yearParam = searchParams.get('year');
  const year = yearParam && /^\d{4}$/.test(yearParam) ? yearParam : null;

  // список годов меняется редко -> держим кэш свежим долго, без повторных запросов при пагинации
  const { data: yearsData } = useQuery({
    queryKey: ['events', 'years'],
    queryFn: () => apiClient.get<ApiList<EventYear>>('/events/years').then((r) => r.data.data),
    staleTime: 1000 * 60 * 60,
  });
  const years = yearsData ?? [];

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['events', year, page],
    queryFn: () =>
      apiClient
        .get<ApiList<Event>>('/events', { params: { page, limit: LIMIT, ...(year ? { year } : {}) } })
        .then((r) => r.data),
    placeholderData: keepPreviousData, // при смене страницы держим прошлые карточки — без мигания
  });

  const goToPage = (next: number) => {
    // меняем только page, фильтр по году сохраняем
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('page', String(next));
      return p;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onYearChange = (next: string) => {
    // смена года всегда сбрасывает пагинацию на 1-ю страницу (page просто не пишем)
    const p = new URLSearchParams();
    if (next) p.set('year', next);
    setSearchParams(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isError) return <><ErrorMessage onRetry={() => refetch()} /> <ExternalLinkCards /></>;

  const events = data?.data ?? [];
  const pageCount = data ? Math.ceil(data.total / LIMIT) : 0;

  return (
    <>
      <section className={styles.section}>
        <h1 className={styles.title}>События</h1>

        {years.length > 0 && (
          <div className={styles.filter}>
            <label htmlFor="year-select" className={styles['filter-label']}>Год:</label>
            <select
              id="year-select"
              className={styles['year-select']}
              value={year ?? ''}
              onChange={(e) => onYearChange(e.target.value)}
            >
              <option value="">Все года</option>
              {years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year} ({y.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* key меняется при первой загрузке, на каждой странице и при смене года -> fade-in проигрывается заново */}
        <ul
          key={isPending ? 'skeleton' : `y-${year ?? 'all'}-page-${page}`}
          className={`${styles['events-grid']} ${isPending ? '' : uiStyles.fadeIn}`}
        >
          {isPending
            ? Array.from({ length: LIMIT }, (_, i) => (
                <li key={i} className={uiStyles.cardSkeleton} />
              ))
            : events.map((event, i) => (
                <li key={event.id}>
                  {/* первый ряд грузим приоритетно — ускоряет LCP при заходе на страницу */}
                  <EventCard event={event} priority={i < 4} />
                </li>
              ))}
        </ul>

        {!isPending && events.length === 0 && (
          <p className={styles.empty}>За выбранный год событий нет.</p>
        )}

        {pageCount > 1 && (
          <ReactPaginate
            pageCount={pageCount}
            forcePage={Math.min(page, pageCount) - 1}
            onPageChange={(e) => goToPage(e.selected + 1)}
            previousLabel="←"
            nextLabel="→"
            marginPagesDisplayed={1}
            pageRangeDisplayed={3}
          />
        )}
      </section>
      <ExternalLinkCards />
      <VideoBlock />
    </>
  );
}
