import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type BviFontSize = 'normal' | 'large' | 'xlarge';
export type BviScheme = 'white' | 'black' | 'blue' | 'beige' | 'green';
export type BviSpacing = 'normal' | 'medium' | 'large';
export type BviImages = 'on' | 'grayscale' | 'off';

interface BviSettings {
  enabled: boolean;
  fontSize: BviFontSize;
  scheme: BviScheme;
  lineHeight: BviSpacing;
  letterSpacing: BviSpacing;
  images: BviImages;
  panelHidden: boolean;
}

interface BviContextValue extends BviSettings {
  enable: () => void;
  disable: () => void;
  set: <K extends keyof BviSettings>(key: K, value: BviSettings[K]) => void;
}

const DEFAULTS: BviSettings = {
  enabled: false,
  fontSize: 'normal',
  scheme: 'white',
  lineHeight: 'normal',
  letterSpacing: 'normal',
  images: 'on',
  panelHidden: false,
};

const STORAGE_KEY = 'bviSettings';

function loadSettings(): BviSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<BviSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const BviContext = createContext<BviContextValue>({
  ...DEFAULTS,
  enable: () => {},
  disable: () => {},
  set: () => {},
});

export function BviProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BviSettings>(loadSettings);

  // Состояние режима выражаем data-атрибутами на <html>, а вся стилизация —
  // в app.css по этим атрибутам. Так компоненты ничего не знают про BVI.
  useEffect(() => {
    const el = document.documentElement;
    if (settings.enabled) {
      el.dataset.bviScheme = settings.scheme;
      el.dataset.bviFont = settings.fontSize;
      el.dataset.bviLineHeight = settings.lineHeight;
      el.dataset.bviLetterSpacing = settings.letterSpacing;
      el.dataset.bviImages = settings.images;
    } else {
      delete el.dataset.bviScheme;
      delete el.dataset.bviFont;
      delete el.dataset.bviLineHeight;
      delete el.dataset.bviLetterSpacing;
      delete el.dataset.bviImages;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value: BviContextValue = {
    ...settings,
    enable: () => setSettings((s) => ({ ...s, enabled: true })),
    disable: () => setSettings((s) => ({ ...s, enabled: false })),
    set: (key, val) => setSettings((s) => ({ ...s, [key]: val })),
  };

  return <BviContext.Provider value={value}>{children}</BviContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBvi = () => useContext(BviContext);
