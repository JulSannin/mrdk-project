import { useQuery } from '@tanstack/react-query';
import type { ApiList, Document } from '../../entities/types';
import apiClient from '../../shared/lib/apiClient';
import { Skeleton } from '../../shared/ui/Skeleton';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { DocumentCard } from '../../entities/Document/DocumentCard';
import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import styles from './DocumentsPage.module.css';
import uiStyles from '../../shared/ui/ui.module.css';
const LIMIT = 100;

export function DocumentsPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: () =>
      apiClient.get<ApiList<Document>>('/documents', { params: { limit: LIMIT } }).then((r) => r.data),
  });

  if (isError) return <><ErrorMessage onRetry={() => refetch()} /> <ExternalLinkCards /></>;

  const items = data?.data ?? [];

  return (
    <>
      <section className={styles.section}>
        <h1 className={styles.title}>Документы</h1>

        {isPending ? (
          <ul key="skeleton" className={styles.grid}>
            {Array.from({ length: 15 }, (_, i) => (
              <li key={i}><Skeleton height="150px" /></li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className={styles.empty}>Документы пока не добавлены.</p>
        ) : (
          <ul key="content" className={`${styles.grid} ${uiStyles.fadeIn}`}>
            {items.map((item) => (
              <li key={item.id}>
                <DocumentCard item={item} />
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
