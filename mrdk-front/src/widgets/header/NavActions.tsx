import { useBvi } from '../../shared/ui/BviContext';
import NavSocialMedia from './NavSocialMedia';
import styles from './Header.module.css';

function NavActions() {
  const { enabled, enable, disable } = useBvi();

  return (
    <div className={styles.header__actions}>
      <button
        type="button"
        className={`bvi-toggle ${styles['header__actions_bvi-button']}`}
        aria-label={enabled ? 'Выключить режим для слабовидящих' : 'Включить режим для слабовидящих'}
        aria-pressed={enabled}
        onClick={enabled ? disable : enable}
      >
        <svg className="bvi-toggle-icon" width="28" height="17" viewBox="0 0 37 22" fill="none" aria-hidden="true">
          <path d="M18.5004 21C23.9566 21 28.3797 16.5228 28.3797 11C28.3797 5.47715 23.9566 1 18.5004 1C13.0441 1 8.62097 5.47715 8.62097 11C8.62097 16.5228 13.0441 21 18.5004 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.5006 7.07153C20.6259 7.07161 22.3698 8.81921 22.3698 11.0002C22.3696 13.1811 20.6258 14.9279 18.5006 14.928C16.3753 14.928 14.6316 13.1812 14.6315 11.0002C14.6315 8.81916 16.3752 7.07153 18.5006 7.07153Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M36 11C36 11 27.7439 21 18.4996 21C9.25527 21 1 11 1 11C1 11 9.1147 1 18.5004 1C27.8861 1 36 11 36 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <NavSocialMedia />
    </div>
  );
}

export default NavActions;