import { socialLinks } from "../../../shared/navigation/socialLinksData";
import { BviImg } from '../../../shared/ui/BviImg';
import styles from './BurgerMenu.module.css';

function BurgerMenuSocialMedia() {
    return (
        <div className={styles.burger__socialmedia}>
            {socialLinks.map(link => (
                <a
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

export default BurgerMenuSocialMedia;