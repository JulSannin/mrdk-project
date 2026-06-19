import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactPaginate from '../../shared/lib/reactPaginate';
import { useQuery } from '@tanstack/react-query';
import type { ApiList, Reminder } from '../../entities/types';
import apiClient from '../../shared/lib/apiClient';
import { Skeleton } from '../../shared/ui/Skeleton';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { BviImg } from '../../shared/ui/BviImg';
import { ReminderCard } from '../../entities/Reminder/ReminderCard';
import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import styles from './RemindersPage.module.css';

const LIMIT = 12;

export function RemindersPage() {
  // номер страницы живёт в URL (?page=2) — ссылка шарится, работают «назад/вперёд»
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const [selected, setSelected] = useState<Reminder | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['reminders', page],
    queryFn: () =>
      apiClient.get<ApiList<Reminder>>('/reminders', { params: { page, limit: LIMIT } }).then((r) => r.data),
  });

  useEffect(() => {
    if (!selected) return;
    // запоминаем элемент, с которого открыли (карточку), и уводим фокус в диалог
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
      // в диалоге фокусируема только кнопка «Закрыть» — держим фокус на ней (trap)
      if (e.key === 'Tab') {
        e.preventDefault();
        closeBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // возвращаем фокус на карточку, с которой открыли
      prevFocusRef.current?.focus();
    };
  }, [selected]);

  if (isPending) return <><Skeleton height="400px" /> <ExternalLinkCards /></>;
  if (isError) return <><ErrorMessage onRetry={() => refetch()} /> <ExternalLinkCards /> </>;

  const reminders = data.data;
  const pageCount = Math.ceil(data.total / LIMIT);

  return (
    <>
      <section className={styles.section}>
        <h1 className={styles.title}>Памятки</h1>
        <ul className={styles.grid}>
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <ReminderCard reminder={reminder} onOpen={setSelected} />
            </li>
          ))}
        </ul>

        {pageCount > 1 && (
          <ReactPaginate
            pageCount={pageCount}
            forcePage={Math.min(page, pageCount) - 1}
            onPageChange={(e) => {
              setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
                p.set('page', String(e.selected + 1));
                return p;
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            previousLabel="←"
            nextLabel="→"
          />
        )}

        {selected && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            className={styles.overlay}
            onClick={() => setSelected(null)}
          >
            <button
              ref={closeBtnRef}
              type="button"
              className={styles.close}
              aria-label="Закрыть"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <BviImg
              className={styles.popupImage}
              src={`/${selected.image_path}`}
              alt={selected.title}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </section>
      <ExternalLinkCards />
      <VideoBlock />
    </>
  );
}