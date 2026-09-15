import { memo } from 'react';
import { videos } from './videoData';
import styles from './Video.module.css';

function VideoBlock() {
  if (videos.length === 0) return null;

  return (
    <div className={styles.grid}>
      {/* preload="none": блок стоит на всех публичных страницах, а с "metadata" браузер
          сразу тянул куски mp4 (в замерах — сотни КБ), деля канал с картинками. Постер задан,
          так что внешне ничего не меняется. На странице события так делать нельзя: там
          у видео нет постера, и первый кадр показывает как раз preload="metadata". */}
      {videos.map((video) => (
        <figure key={video.src} className={styles.figure}>
          <video className={styles.video} controls preload="none" poster={video.poster}>
            <source src={video.src} type="video/mp4" />
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        </figure>
      ))}
    </div>
  );
}

export default memo(VideoBlock);
