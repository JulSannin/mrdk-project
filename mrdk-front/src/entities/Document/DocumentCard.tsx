import type { Document } from '../types';
import styles from './DocumentCard.module.css';

export function DocumentCard({ item }: { item: Document }) {
  return (
    <a className={styles.card} href={`/api/documents/${item.id}`} download>
      <span className={styles.icon} aria-hidden="true">📄</span>
      <span className={styles.title}>{item.title}</span>
      <span className={styles.download}>
        <span aria-hidden="true">⇩</span> Скачать
      </span>
    </a>
  );
}
