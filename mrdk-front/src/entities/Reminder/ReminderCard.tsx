import type { Reminder } from '../types';
import { BviImg } from '../../shared/ui/BviImg';
import styles from './ReminderCard.module.css';

interface Props {
  reminder: Reminder;
  onOpen: (reminder: Reminder) => void;
}

export function ReminderCard({ reminder, onOpen }: Props) {
  return (
    <button type="button" className={styles.card} onClick={() => onOpen(reminder)}>
      <BviImg
        className={styles.image}
        src={`/${reminder.image_path}`}
        alt={reminder.title}
        loading="lazy"
      />
      <span className={styles.title}>{reminder.title}</span>
    </button>
  );
}
