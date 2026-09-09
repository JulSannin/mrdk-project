import { socialLinks } from '../../../shared/navigation/socialLinksData';
import { BviImg } from '../../../shared/bvi/BviImg';
import styles from './BurgerMenu.module.css';

function BurgerMenuSocialMedia() {
  return (
    <ul className={styles.burger__socialmedia}>
      {socialLinks.map((link) => (
        <li key={link.href}>
          <a href={link.href} target={link.target} rel={link.rel} aria-label={link.ariaLabel}>
            <BviImg src={link.icon} alt={link.label} />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default BurgerMenuSocialMedia;
