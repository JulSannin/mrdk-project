import { socialLinks } from '../../shared/navigation/socialLinksData';
import { BviImg } from '../../shared/ui/BviImg';
import styles from './Header.module.css';

function NavSocialMedia() {
    return (
        <ul className={styles.header__socialmedia}>
            {socialLinks.map(link => (
                <li key={link.href}>
                    <a
                        className={styles.header__socialmedia_link}
                        href={link.href}
                        target={link.target}
                        rel={link.rel}
                        aria-label={link.ariaLabel}
                    >
                        <BviImg src={link.icon} alt={link.label} />
                    </a>
                </li>
            ))}
        </ul>
    );
}

export default NavSocialMedia;