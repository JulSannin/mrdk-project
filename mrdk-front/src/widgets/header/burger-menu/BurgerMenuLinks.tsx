import { NavLink } from 'react-router-dom';
import type { NavLinkItem } from '../../../shared/navigation/typesLinks';
import styles from './BurgerMenu.module.css';

interface BurgerMenuLinkItemProps {
    link: NavLinkItem;
    onClick: () => void;
}

function BurgerMenuLinks({ link, onClick }: BurgerMenuLinkItemProps) {
    if (link.type === 'internal') {
        return (
            <NavLink
                to={link.path}
                onClick={onClick}
                className={({ isActive }) =>
                    [
                        styles.burger__navlink,
                        isActive ? styles.burger__navlink_active : '',
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
                onClick={onClick}
                className={[styles.burger__navlink, styles.burger__navlink_external].join(' ')}
            >
                {link.label}
            </a>
        );
    }
}

export default BurgerMenuLinks;
