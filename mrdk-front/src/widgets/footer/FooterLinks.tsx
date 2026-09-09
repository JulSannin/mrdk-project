import { NavLink } from 'react-router-dom';
import { footerLinks } from '../../shared/navigation/footerLinksData';
import logo from '../../shared/assets/logo_v2.svg';
import { memo } from 'react';
import { BviImg } from '../../shared/bvi/BviImg';
import styles from './Footer.module.css';

export function FooterLinks() {
  return (
    <div className={styles.footer__links_container}>
      <p className={styles.footer__links_p}>Навигация</p>
      <hr className={styles.footer__links_hr} />
      <nav aria-label="Навигация в подвале">
        <ul className={styles.footer__nav}>
          {footerLinks.map((link) => {
            if (link.path === '/contacts') return null;
            return (
              <li key={link.path}>
                <NavLink
                  to={link.path}
                  viewTransition
                  className={({ isActive }) =>
                    [styles.footer__navlink, isActive ? styles.footer__navlink_active : '']
                      .filter(Boolean)
                      .join(' ')
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <hr className={styles.footer__links_hr} />
      <BviImg
        src={logo}
        alt="Логотип Мариинский районный дом культуры"
        className={styles.footer__logo}
      />
    </div>
  );
}

export default memo(FooterLinks);
