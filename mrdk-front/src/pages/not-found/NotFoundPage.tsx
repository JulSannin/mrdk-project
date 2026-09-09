import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <section className={styles.section}>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1 className={styles.title}>Страница не найдена</h1>
      <p className={styles.text}>
        Возможно, страница была удалена или вы перешли по устаревшей ссылке.
      </p>
      <Link to="/" className={styles.homeLink}>
        На главную
      </Link>
    </section>
  );
}
