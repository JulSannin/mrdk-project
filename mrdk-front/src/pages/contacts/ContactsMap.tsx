import { useEffect, useRef } from 'react';
import { load2gis, getDG, type DGMap } from '../../shared/lib/load2gis';
import { DGIS_KEY, mapMarkers } from './contactsMapData';
import styles from './ContactsMap.module.css';

const enabled = Boolean(DGIS_KEY) && mapMarkers.length > 0;

export function   ContactsMap({ fallbackHref }: { fallbackHref: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    const container = containerRef.current;
    let map: DGMap | undefined;
    let destroyed = false;

    load2gis(DGIS_KEY)
      .then(() => {
        if (destroyed) return;
        const DG = getDG();
        const coords = mapMarkers.map((m) => m.coordinates);
        map = DG.map(container, { center: coords[0], zoom: 12 });

        for (const m of mapMarkers) {
          DG.marker(m.coordinates).addTo(map).bindPopup(m.label);
        }

        if (coords.length > 1) {
          map.fitBounds(DG.latLngBounds(coords), { padding: [40, 40] });
        }
      })
      .catch(() => {
      });

    return () => {
      destroyed = true;
      map?.remove();
    };
  }, []);

  if (!enabled) {
    return (
      <a className={styles.fallback} href={fallbackHref} target="_blank" rel="noopener noreferrer">
        <span aria-hidden="true">📍</span> Посмотреть на карте (2ГИС)
      </a>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.map}
      aria-label="Карта с расположением учреждения и его филиалов"
    />
  );
}
