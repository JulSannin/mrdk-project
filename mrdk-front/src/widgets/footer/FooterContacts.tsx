import { NavLink } from "react-router-dom";
import { footerLinks } from "../../shared/navigation/footerLinksData";
import styles from './Footer.module.css';

function FooterContacts() {
    const contactsLink = footerLinks.find(
        (link) => link.path === '/contacts',
    );

    return (
        <div className={styles.footer__contacts}>
            <NavLink
                className={({ isActive }) =>
                    [
                        styles.footer__contacts_title,
                        isActive ? styles.footer__contacts_title_active : ''
                    ]
                        .filter(Boolean)
                        .join(' ')}

                to={contactsLink?.path || '/'}
                viewTransition
            >
                {contactsLink?.label}
            </NavLink>
            <hr className={styles.footer__contacts_hr} />
            <p className={styles.footer__contacts_info}>
                <span className={styles.footer__contacts_info_label}>E-mail: </span>
                <a href="mailto:rbk-pristan@mail.ru" className={styles['footer__contacts_info_mail-link']}>
                    rdk-pristan@mail.ru
                </a>
                <br />
                <span className={styles.footer__contacts_info_label}>Адрес</span>: Кемеровская
                область, Мариинский район, д.2-Пристань, ул.Весенняя, 13
                <br />
                <span className={styles.footer__contacts_info_label}>Телефон</span>:
                <a 
                    href="tel:+89230318935" 
                    className={styles['footer__contacts_info_tel-link']}
                >
                    +8-923-031-89-35
                </a> , 37-1-36
            </p>
        </div>
    )
}

export default FooterContacts;