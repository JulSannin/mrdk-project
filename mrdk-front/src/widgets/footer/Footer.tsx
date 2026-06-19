import styles from './Footer.module.css';
import FooterContacts from './FooterContacts';
import FooterLinks from './FooterLinks';
import FooterSocialMedia from './FooterSocialMedia';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footer__container}>
        <div className={styles.footer__row}>
          <FooterLinks />
          <FooterSocialMedia />
          <FooterContacts />
        </div>
        <p className={styles.footer__copyright}>
          Муниципальное бюджетное учреждение культуры «Районный дом культуры» 2026 — все права защищены.
        </p>
      </div>
    </footer>
  );
}