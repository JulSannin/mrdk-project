import { useConsent, acceptConsent } from '../../shared/analytics/consent';
import styles from './ConsentBanner.module.css';

export function ConsentBanner() {
  // Согласие хранится в общем сторе, а не в локальном состоянии: на него
  // подписана Яндекс.Метрика, которая до нажатия «Принять» не грузится.
  const accepted = useConsent();

  if (accepted) return null;

  return (
    <div
      className={`consent-banner ${styles.banner}`}
      role="region"
      aria-label="Обработка персональных данных"
    >
      <p className={styles.text}>
        Продолжая пользоваться сайтом, вы соглашаетесь на обработку файлов cookie и персональных
        данных в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
      </p>
      <button type="button" className={`consent-accept ${styles.button}`} onClick={acceptConsent}>
        Принять
      </button>
    </div>
  );
}
