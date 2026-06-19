import { socialLinks } from '../../shared/navigation/socialLinksData';
import { BviImg } from '../../shared/ui/BviImg';
import styles from './Footer.module.css';

function FooterSocialMedia() {
    return (
        <div className={styles.footer__socialmedia_container}>
            <p className={styles.footer__socialmedia_p}>Социальные сети</p>
            <hr className={styles.footer__socialmedia_hr} />
            <div className={styles.footer__socialmedia_links}>
                {socialLinks.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        target={link.target}
                        rel={link.rel}
                        aria-label={link.ariaLabel}
                        className={styles.footer__socialmedia_link}
                    >
                        <BviImg src={link.icon} alt={link.label} />
                    </a>
                ))}
            </div>
        </div>
    )
}

export default FooterSocialMedia;