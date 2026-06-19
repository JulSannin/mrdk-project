// Динамическая загрузка 2ГИС Raster JS API (глобальный объект DG, на базе Leaflet).
// Скрипт-загрузчик подключаем один раз и кэшируем промис.
//
// ВАЖНО: у DG есть метод .then (колбэк готовности API), поэтому объект DG — «thenable».
// Если резолвить промис значением DG, и рантайм, и типы развернут его в undefined.
// Поэтому load2gis резолвится в void, а сам DG берём через getDG() после загрузки.

export interface DGMap {
  remove(): void;
  fitBounds(bounds: unknown, options?: { padding?: [number, number] }): void;
}

interface DGMarker {
  addTo(map: DGMap): DGMarker;
  bindPopup(html: string): DGMarker;
}

export interface DG {
  /** Колбэк, который вызывается, когда API полностью готов. */
  then(callback: () => void): void;
  map(container: HTMLElement, options: { center: [number, number]; zoom: number }): DGMap;
  marker(latlng: [number, number]): DGMarker;
  latLngBounds(latlngs: [number, number][]): unknown;
}

declare global {
  interface Window {
    DG?: DG;
  }
}

let cached: Promise<void> | null = null;

export function load2gis(key: string): Promise<void> {
  if (cached) return cached;

  cached = new Promise<void>((resolve, reject) => {
    // DG.then резолвится, когда вся библиотека готова к использованию
    const whenReady = () => {
      if (window.DG) window.DG.then(() => resolve());
      else reject(new Error('2ГИС загрузился, но window.DG недоступен'));
    };

    if (window.DG) {
      whenReady();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.api.2gis.ru/2.0/loader.js?pkg=full&key=${encodeURIComponent(key)}`;
    script.async = true;
    script.onload = whenReady;
    script.onerror = () => {
      cached = null; // дать возможность повторить попытку позже
      reject(new Error('Не удалось загрузить 2ГИС'));
    };
    document.head.appendChild(script);
  });
  return cached;
}

export function getDG(): DG {
  if (!window.DG) throw new Error('2ГИС ещё не загружен');
  return window.DG;
}
