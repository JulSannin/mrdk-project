import styles from './ui.module.css';

interface Props {
  height?: string;
  width?: string;
}

export function Skeleton({ height = '1rem', width = '100%' }: Props) {
  // role="status" + aria-label — чтобы скринридер сообщал о загрузке
  // (визуально это просто мерцающий блок-заглушка).
  return (
    <div
      className={styles.skeleton}
      style={{ height, width }}
      role="status"
      aria-label="Загрузка…"
    />
  );
}