import { useRouteError, Link } from 'react-router-dom';
import styles from './ui.module.css';

// Фолбэк для errorElement роутера: показывается, если страница упала с
// необработанной ошибкой (иначе пользователь увидел бы белый экран).
export function RouteError() {
  const error = useRouteError();
  // в dev пишем в консоль для диагностики; в проде сюда можно подключить отправку в логи
  if (import.meta.env.DEV) console.error('Необработанная ошибка маршрута:', error);

  return (
    <div role="alert" className={styles['route-error']}>
      <h1>Что-то пошло не так</h1>
      <p>Попробуйте обновить страницу или вернуться на главную.</p>
      <div className={styles['route-error__actions']}>
        <button type="button" onClick={() => window.location.reload()}>Обновить</button>
        <Link to="/">На главную</Link>
      </div>
    </div>
  );
}
