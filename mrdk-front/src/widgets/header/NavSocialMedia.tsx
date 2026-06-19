import { socialLinks } from '../../shared/navigation/socialLinksData';
import { BviImg } from '../../shared/ui/BviImg';
import styles from './Header.module.css';

function NavSocialMedia() {
    return (
        <div className={styles.header__socialmedia}>
            {socialLinks.map(link => (
                <a
                    className={styles.header__socialmedia_link}
                    key={link.href}
                    href={link.href}
                    target={link.target}
                    rel={link.rel}
                    aria-label={link.ariaLabel}
                >
                    <BviImg src={link.icon} alt={link.label} />
                </a>
            ))}
        </div>
    );
}

export default NavSocialMedia;