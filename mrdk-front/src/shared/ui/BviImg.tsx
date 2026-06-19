import type { ImgHTMLAttributes, CSSProperties } from 'react';
import { useBvi } from './BviContext';

// В режиме «изображения выкл» (BVI) вместо картинки показываем блок того же размера
// с текстом alt — как в эталонном виджете bvi.isvek.ru. Иначе — обычный <img>.
export function BviImg({ alt, className, style, width, height, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const { enabled, images } = useBvi();

  if (enabled && images === 'off') {
    const boxStyle: CSSProperties = { ...style };
    if (width != null) boxStyle.width = typeof width === 'number' ? `${width}px` : width;
    if (height != null) boxStyle.height = typeof height === 'number' ? `${height}px` : height;
    return (
      <span className={['bvi-img-off', className].filter(Boolean).join(' ')} style={boxStyle}>
        {alt || 'Нет описания к изображению'}
      </span>
    );
  }

  return <img alt={alt} className={className} style={style} width={width} height={height} {...rest} />;
}
