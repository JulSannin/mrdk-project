import { useBvi } from './BviContext';
import type { BviScheme, BviSpacing, BviImages, BviFontSize } from './BviContext';
import styles from './BviPanel.module.css';

const FONT_LEVELS: BviFontSize[] = ['normal', 'large', 'xlarge'];

const SCHEME: { id: BviScheme; label: string }[] = [
  { id: 'white', label: 'Чёрным по белому' },
  { id: 'black', label: 'Белым по чёрному' },
  { id: 'blue', label: 'Тёмно-синим по голубому' },
  { id: 'beige', label: 'Коричневым по бежевому' },
  { id: 'green', label: 'Зелёным по тёмно-коричневому' },
];

const IMAGES: { id: BviImages; label: string; icon: string }[] = [
  { id: 'on', label: 'Изображения включены', icon: '●' },
  { id: 'off', label: 'Изображения выключены', icon: '○' },
  { id: 'grayscale', label: 'Изображения чёрно-белые', icon: '◐' },
];

const SPACING: [BviSpacing, string][] = [
  ['normal', 'Обычный'],
  ['medium', 'Средний'],
  ['large', 'Большой'],
];

export function BviPanel() {
  const bvi = useBvi();
  if (!bvi.enabled) return null;

  if (bvi.panelHidden) {
    return (
      <div className={`bvi-panel ${styles.collapsed}`}>
        <button type="button" className={styles.show} onClick={() => bvi.set('panelHidden', false)}>
          Показать панель для слабовидящих
        </button>
      </div>
    );
  }

  const fontIdx = FONT_LEVELS.indexOf(bvi.fontSize);
  const stepFont = (delta: number) =>
    bvi.set('fontSize', FONT_LEVELS[Math.min(FONT_LEVELS.length - 1, Math.max(0, fontIdx + delta))]);

  return (
    <aside className={`bvi-panel ${styles.panel}`} aria-label="Настройки версии для слабовидящих">
      <div className={styles.group} role="group" aria-label="Размер шрифта">
        <span className={styles.title}>Размер шрифта</span>
        <div className={styles.btnGroup}>
          <button type="button" className={styles.btn} onClick={() => stepFont(-1)} disabled={fontIdx <= 0} aria-label="Уменьшить шрифт">
            A−
          </button>
          <button type="button" className={styles.btn} onClick={() => stepFont(1)} disabled={fontIdx >= FONT_LEVELS.length - 1} aria-label="Увеличить шрифт">
            A+
          </button>
        </div>
      </div>

      <div className={styles.group} role="group" aria-label="Цвета сайта">
        <span className={styles.title}>Цвета сайта</span>
        <div className={styles.btnGroup}>
          {SCHEME.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.swatch} bvi-swatch-${s.id}`}
              aria-pressed={bvi.scheme === s.id}
              aria-label={s.label}
              title={s.label}
              onClick={() => bvi.set('scheme', s.id)}
            >
              А
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group} role="group" aria-label="Изображения">
        <span className={styles.title}>Изображения</span>
        <div className={styles.btnGroup}>
          {IMAGES.map((i) => (
            <button
              key={i.id}
              type="button"
              className={styles.btn}
              aria-pressed={bvi.images === i.id}
              aria-label={i.label}
              title={i.label}
              onClick={() => bvi.set('images', i.id)}
            >
              {i.icon}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group} role="group" aria-label="Междустрочный интервал">
        <span className={styles.title}>Строки</span>
        <div className={styles.btnGroup}>
          {SPACING.map(([v, t]) => (
            <button key={v} type="button" className={styles.btn} aria-pressed={bvi.lineHeight === v} onClick={() => bvi.set('lineHeight', v)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group} role="group" aria-label="Межбуквенный интервал">
        <span className={styles.title}>Буквы</span>
        <div className={styles.btnGroup}>
          {SPACING.map(([v, t]) => (
            <button key={v} type="button" className={styles.btn} aria-pressed={bvi.letterSpacing === v} onClick={() => bvi.set('letterSpacing', v)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.title}>Дополнительно</span>
        <div className={styles.btnGroup}>
          <button type="button" className={styles.btn} onClick={() => bvi.set('panelHidden', true)} title="Скрыть панель" aria-label="Скрыть панель">
            ⌃
          </button>
          <button type="button" className={styles.btn} onClick={bvi.disable}>
            Обычная версия
          </button>
        </div>
      </div>
    </aside>
  );
}
