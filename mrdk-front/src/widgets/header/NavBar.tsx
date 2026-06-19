import { headerLinks } from '../../shared/navigation/headerLinksData';
import { memo } from 'react';
import NavLinks from './NavLinks';
import styles from './Header.module.css';

function NavBar() {
    
    return (
        <nav className={styles.header__nav} aria-label='Основная навигация'>
            {headerLinks.map(link => (
                <NavLinks
                key={link.type === 'internal' ? link.path : link.href}
                link={link}
                />
            ))}
        </nav>
    );
}

export default memo(NavBar);