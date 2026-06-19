import { headerLinks } from '../../../shared/navigation/headerLinksData';
import BurgerMenuLinks from './BurgerMenuLinks';
import styles from './BurgerMenu.module.css';
import BurgerMenuSocialMedia from './BurgerMenuSocialMedia';

function BurgerMenuPanel({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    return (
        <>
            <div
                className={[
                    styles.burger__layout,
                    isOpen ? styles.burger__layout_open : styles.burger__layout_closer
                ].join(' ')}
                onClick={onClose}
            />
            <nav
                className={[
                    styles.burger__panel,
                    'bvi-burger-panel',
                    isOpen ? styles.burger__panel_open : styles.burger__panel_closer
                ].join(' ')}
            >
                <hr className={styles.burger__panel_hr}/>
                {headerLinks.map((link) => (
                    <BurgerMenuLinks
                        key={link.type === 'internal' ? link.path : link.href}
                        link={link}
                        onClick={onClose}
                    />
                )

                )}
                <BurgerMenuSocialMedia />
                <hr className="bvi-burger-end" />
            </nav>
        </>
    )
}

export default BurgerMenuPanel;
