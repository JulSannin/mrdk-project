import { memo } from 'react';
import styles from './ExternalLinkCards.module.css';
import { ListExternalLinkCards } from './ListExternalLinkCards';
import { BviImg } from '../../shared/ui/BviImg';

function ExternalLinkCards() {
  return (
    <div className={styles.block}>
      <div className={styles.grid}>
        {ListExternalLinkCards.map(({ image, link, title }) => (
          <a
            key={image}
            href={link || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.card}
            aria-label={title}
          >
            <BviImg className={styles.image} src={image} alt={title ?? ''} fetchPriority="high" width={300} height={150}/>
          </a>
        ))}
      </div>
    </div>
  );
}

export default memo(ExternalLinkCards);