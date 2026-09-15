import type { Reminder } from '../types';
import { BviImg } from '../../shared/bvi/BviImg';
import styles from './ReminderCard.module.css';

interface Props {
  reminder: Reminder;
  onOpen: (reminder: Reminder) => void;
  /** Список уже запросил другую страницу: оборвать недогруженную картинку (см. BviImg). */
  paused?: boolean;
}

export function ReminderCard({ reminder, onOpen, paused }: Props) {
  return (
    <button type="button" className={styles.card} onClick={() => onOpen(reminder)}>
      <BviImg
        className={styles.image}
        skeleton
        src={`/${reminder.image_path}`}
        alt={reminder.title}
        loading="lazy"
        paused={paused}
      />
      <span className={styles.title}>{reminder.title}</span>
    </button>
  );
}
