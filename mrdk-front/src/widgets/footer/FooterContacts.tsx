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
            <address className={styles.footer__contacts_info}>
                <dl className={styles.footer__contacts_dl}>
                    <div className={styles.footer__contacts_dl_row}>
                        <dt className={styles.footer__contacts_info_label}>E-mail:</dt>
                        <dd className={styles.footer__contacts_dd}>
                            <a href="mailto:rdk-pristan@mail.ru" className={styles['footer__contacts_info_mail-link']}>
                                rdk-pristan@mail.ru
                            </a>
                        </dd>
                    </div>
                    <div className={styles.footer__contacts_dl_row}>
                        <dt className={styles.footer__contacts_info_label}>Адрес:</dt>
                        <dd className={styles.footer__contacts_dd}>
                            Кемеровская область, Мариинский район, д. 2-Пристань, ул. Весенняя, 13
                        </dd>
                    </div>
                    <div className={styles.footer__contacts_dl_row}>
                        <dt className={styles.footer__contacts_info_label}>Телефон:</dt>
                        <dd className={styles.footer__contacts_dd}>
                            <a href="tel:+79230318935" className={styles['footer__contacts_info_tel-link']}>
                                +7-923-031-89-35
                            </a>, 37-1-36
                        </dd>
                    </div>
                </dl>
            </address>
        </div>
    )
}

export default FooterContacts;