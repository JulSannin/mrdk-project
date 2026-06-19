import { useState } from 'react';
import styles from './ConsentBanner.module.css';

const STORAGE_KEY = 'pdConsentAccepted';

export function ConsentBanner() {
  const [accepted, setAccepted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  if (accepted) return null;

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage недоступен — просто скрываем на текущую сессию
    }
    setAccepted(true);
  };

  return (
    <div className={`consent-banner ${styles.banner}`} role="region" aria-label="Обработка персональных данных">
      <p className={styles.text}>
        Продолжая пользоваться сайтом, вы соглашаетесь на обработку файлов cookie и персональных
        данных в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
      </p>
      <button type="button" className={`consent-accept ${styles.button}`} onClick={accept}>
        Принять
      </button>
    </div>
  );
}
