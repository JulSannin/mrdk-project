import { useQuery } from '@tanstack/react-query';
import type { ApiSingle, Club } from '../../entities/types';
import apiClient from '../../shared/lib/apiClient';
import { Skeleton } from '../../shared/ui/Skeleton';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import styles from './ClubsPage.module.css';

export function ClubsPage() {
  const { data: clubs, isPending, isError, refetch } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => apiClient.get<ApiSingle<Club[]>>('/clubs').then((r) => r.data.data),
  });

  if (isPending)
    return (
      <>
        <Skeleton height="300px" />
        <ExternalLinkCards />
      </>
    );
  if (isError)
    return (
      <>
        <ErrorMessage onRetry={() => refetch()} />
        <ExternalLinkCards />
      </>
    );

  return (
    <>
      <section className={styles.section}>
        <h1 className={styles.title}>Клубы и секции</h1>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Список клубов и руководителей</caption>
            <thead>
              <tr>
                <th className={`${styles.th} ${styles.numCol}`}>№</th>
                <th className={styles.th}>Название</th>
                <th className={styles.th}>Руководитель</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club, index) => (
                <tr
                  key={club.id}
                  className={`${styles.tr} ${index % 2 === 0 ? '' : styles.odd}`}
                >
                  <td className={`${styles.td} ${styles.numCol}`}>{index + 1}</td>
                  <td className={styles.td}>{club.name}</td>
                  <td className={styles.td}>{club.leader || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ExternalLinkCards />
      <VideoBlock />
    </>
  );
}