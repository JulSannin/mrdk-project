import { useState, useCallback } from 'react';
import BurgerMenuButton from './burger-menu/BurgerMenuButton';
import NavLogo from './NavLogo';
import NavBar from './NavBar';
import NavActions from './NavActions';
import BurgerMenuPanel from './burger-menu/BurgerMenuPanel';
import styles from './Header.module.css';


export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  return (
    <header className={styles.header}>
      <div className={styles.header__container}>
        <BurgerMenuButton isOpen={isOpen} onToggle={toggleMenu} />
        <NavLogo />
        <NavBar />
        <NavActions />
      </div>
      <BurgerMenuPanel isOpen={isOpen} onClose={closeMenu} />
    </header>
  );
}