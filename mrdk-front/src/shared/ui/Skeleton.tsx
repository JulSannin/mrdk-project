import styles from './ui.module.css';

interface Props {
  height?: string;
  width?: string;
}

export function Skeleton({ height = '1rem', width = '100%' }: Props) {
  return <div className={styles.skeleton} style={{ height, width }} />;
}