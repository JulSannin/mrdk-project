import styles from './BurgerMenu.module.css';

function BurgerMenuButton({
    isOpen,
    onToggle,
}: {
    isOpen: boolean;
    onToggle: () => void;
}) {
    const spanClass = `${styles.burger__button_span} ${isOpen ? styles.burger__button_span_open : ''}`.trim();

    return (
        <button
            className={styles.burger__button}
            onClick={onToggle}
            aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
            {[...Array(3)].map((_, i) => (
                <span key={i} className={spanClass} />
            ))}
        </button>
    );
}

export default BurgerMenuButton;