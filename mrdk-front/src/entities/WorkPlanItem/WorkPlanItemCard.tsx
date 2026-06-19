import type { WorkPlanItem } from '../types';
import styles from './WorkPlanItemCard.module.css';

export function WorkPlanItemCard({ item }: { item: WorkPlanItem }) {
  return (
    <a className={styles.card} href={`/api/workplan/${item.id}`} download>
      <span className={styles.icon} aria-hidden="true">📄</span>
      <span className={styles.title}>{item.title}</span>
      <span className={styles.download}>
        <span aria-hidden="true">⇩</span> Скачать
      </span>
    </a>
  );
}
