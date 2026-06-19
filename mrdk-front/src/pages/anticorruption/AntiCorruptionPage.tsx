import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import { corruptionDocuments } from './anticorruptionData';
import styles from './AntiCorruptionPage.module.css';

export function AntiCorruptionPage() {
  return (
    <>
      <section className={styles.section}>
        <h1 className={styles.title}>Противодействие коррупции</h1>

        <ul className={styles.list}>
          {corruptionDocuments.map((doc) => (
            <li key={doc.href} className={styles.item}>
              {doc.pdf ? (
                <a className={styles.link} href={doc.href} download={`${doc.label}.pdf`}>
                  {doc.label}
                </a>
              ) : (
                <a className={styles.link} href={doc.href} target="_blank" rel="noopener noreferrer">
                  {doc.label}
                </a>
              )}
              {doc.pdf && <span className={styles.badge}>pdf</span>}
            </li>
          ))}
        </ul>

        <p className={styles.note}>
          О фактах коррупционного проявления в учреждениях МБУК «Районный Дом культуры»
          вы можете сообщить посредством формы обратной связи в{' '}
          <a
            className={styles.link}
            href="http://lib42.ru/feedback/mariinsk/"
            target="_blank"
            rel="noopener noreferrer"
          >
            «Виртуальной приёмной»
          </a>
          .
        </p>
      </section>
      <ExternalLinkCards />
      <VideoBlock />
    </>
  );
}
