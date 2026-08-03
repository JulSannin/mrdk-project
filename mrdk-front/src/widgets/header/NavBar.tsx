import { headerLinks } from '../../shared/navigation/headerLinksData';
import { memo } from 'react';
import NavLinks from './NavLinks';
import styles from './Header.module.css';

function NavBar() {
    
    return (
        <nav className={styles.header__nav_wrap} aria-label='Основная навигация'>
            <ul className={styles.header__nav}>
                {headerLinks.map(link => (
                    <li key={link.type === 'internal' ? link.path : link.href}>
                        <NavLinks link={link} />
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export default memo(NavBar);