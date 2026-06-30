import { NavLink } from 'react-router-dom';
import logo from '../../shared/assets/logo_v2.svg';
import styles from './Header.module.css';

function NavLogo() {
    return (
        <NavLink to='/' className={styles['header__logo-link']} aria-label='Перейти на главную страницу'>
            {/* alt='' — картинка декоративная: ссылка озвучивается через aria-label выше.
                Так alt не попадает в сниппет поисковика. */}
            <img className={styles['header__logo-img']} src={logo} alt='' />
        </NavLink>
    );
}

export default NavLogo;