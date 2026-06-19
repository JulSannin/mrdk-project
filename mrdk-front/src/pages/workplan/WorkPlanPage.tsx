import { useQuery } from '@tanstack/react-query';
import type { ApiList, WorkPlanItem } from '../../entities/types';
import apiClient from '../../shared/lib/apiClient';
import { Skeleton } from '../../shared/ui/Skeleton';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { WorkPlanItemCard } from '../../entities/WorkPlanItem/WorkPlanItemCard';
import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import styles from './WorkPlanPage.module.css';

const LIMIT = 100;

export function WorkPlanPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['workplan'],
    queryFn: () =>
      apiClient.get<ApiList<WorkPlanItem>>('/workplan', { params: { limit: LIMIT } }).then((r) => r.data),
  });

  if (isPending) return <><Skeleton height="300px" /> <ExternalLinkCards /></>;
  if (isError) return <><ErrorMessage onRetry={() => refetch()} /> <ExternalLinkCards /></>;

  const groups: { year: number | null; items: WorkPlanItem[] }[] = [];
  for (const item of data.data) {
    const last = groups[groups.length - 1];
    if (last && last.year === item.year) last.items.push(item);
    else groups.push({ year: item.year, items: [item] });
  }

  return (
    <>
      <section className={styles.section}>
        <h1>Планы работы</h1>

        {groups.length === 0 && <p className={styles.empty}>Планы работы пока не добавлены.</p>}

        {groups.map((g) => (
          <div key={g.year ?? 'none'}>
            <h2 className={styles.yearTitle}>{g.year ?? 'Без года'}</h2>
            <ul className={styles.grid}>
              {g.items.map((item) => (
                <li key={item.id}>
                  <WorkPlanItemCard item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <ExternalLinkCards />
      <VideoBlock />
    </>
  );
}
