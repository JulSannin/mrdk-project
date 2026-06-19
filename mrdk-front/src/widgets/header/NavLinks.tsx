import { NavLink } from 'react-router-dom';
import type { NavLinkItem } from '../../shared/navigation/typesLinks';
import styles from './Header.module.css';

interface NavLinkItemProps {
    link: NavLinkItem;
}

function NavLinks({ link }: NavLinkItemProps) {
    if (link.type === 'internal') {
        return (
            <NavLink
                to={link.path}
                className={({ isActive }) =>
                    [
                        styles.header__navlink,
                        styles.header__navlink_internal,
                        isActive ? styles.header__navlink_active : '',
                    ]
                        .filter(Boolean)
                        .join(' ')
                }
            >
                {link.label}
            </NavLink>
        );
    } else {
        return (
            <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={[styles.header__navlink, styles.header__navlink_external].join(' ')}
            >
                {link.label}
            </a>
        );
    }
}

export default NavLinks;