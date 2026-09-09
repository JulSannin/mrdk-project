import { socialLinks } from '../../shared/navigation/socialLinksData';
import { BviImg } from '../../shared/ui/BviImg';
import styles from './Footer.module.css';

function FooterSocialMedia() {
  return (
    <div className={styles.footer__socialmedia_container}>
      <p className={styles.footer__socialmedia_p}>Социальные сети</p>
      <hr className={styles.footer__socialmedia_hr} />
      <ul className={styles.footer__socialmedia_links}>
        {socialLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target={link.target}
              rel={link.rel}
              aria-label={link.ariaLabel}
              className={styles.footer__socialmedia_link}
            >
              <BviImg src={link.icon} alt={link.label} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FooterSocialMedia;
