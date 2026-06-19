import { memo } from 'react';
import { videos } from './videoData';
import styles from './Video.module.css';

function VideoBlock() {
  if (videos.length === 0) return null;

  return (
      <div className={styles.grid}>
        {videos.map((video) => (
          <figure key={video.src} className={styles.figure}>
            <video
              className={styles.video}
              controls
              preload="metadata"
              poster={video.poster}
            >
              <source src={video.src} type="video/mp4" />
              Ваш браузер не поддерживает воспроизведение видео.
            </video>
          </figure>
        ))}
      </div>
  );
}

export default memo(VideoBlock);