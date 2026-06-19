import styles from './ui.module.css'

interface Props {
  message?: string;
  onRetry: () => void;
}

export function ErrorMessage({ message = 'Ошибка загрузки данных', onRetry }: Props) {
  return (
    <div role="alert" className={styles['error-message']}>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Повторить запрос
      </button>
    </div>
  );
}