import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ApiSingle, Event } from '../../entities/types';
import apiClient from '../../shared/lib/apiClient';
import { Skeleton } from '../../shared/ui/Skeleton';
import { ErrorMessage } from '../../shared/ui/ErrorMessage';
import { BviImg } from '../../shared/ui/BviImg';
import { formatDate } from '../../shared/lib/dateHelpers';
import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import styles from './EventDetailPage.module.css';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isPending, isError, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: () => apiClient.get<ApiSingle<Event>>(`/events/${id}`).then((r) => r.data.data),
  });

  if (isPending) return <><Skeleton height="400px" /><ExternalLinkCards /></>;
  if (isError) return <><ErrorMessage message="Не удалось загрузить событие" onRetry={() => refetch()} /><ExternalLinkCards /></>;

  return (
    <>
      <article className={styles.section}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)}>
          ← Назад
        </button>
        <BviImg
          className={styles.cover}
          src={event.image_path ? `/${event.image_path}` : '/default.jpg'}
          alt={event.title}
        />
        <h1>{event.title}</h1>
        {event.event_date && (
          <time className={styles.date}>{formatDate(event.event_date)}</time>
        )}
        <div className={styles.description}>
          {event.description?.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {event.images && event.images.length > 0 && (
          <div className={styles.gallery}>
            <h2 className={styles.galleryTitle}>Фотографии</h2>
            <div className={styles.galleryGrid}>
              {event.images.map((img) => (
                <BviImg key={img.id} src={`/${img.image_path}`} alt={event.title} />
              ))}
            </div>
          </div>
        )}
        {event.videos && event.videos.length > 0 && (
          <div>
            <h2 className={styles.galleryTitle}>Видео</h2>
            <div className={styles.videoGrid}>
              {event.videos.map((vid) => (
                <video
                  key={vid.id}
                  className={styles.video}
                  src={`/${vid.video_path}`}
                  controls
                  preload="metadata"
                  playsInline
                />
              ))}
            </div>
          </div>
        )}
      </article>
      <ExternalLinkCards />
      <VideoBlock />
    </>
  );
}
