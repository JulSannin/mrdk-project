import { useCallback, useState } from 'react';
import type { ImgHTMLAttributes, CSSProperties } from 'react';
import { useBvi } from './BviContext';
import styles from '../ui/ui.module.css';

// Список пропсов задан явно, а не унаследован от ImgHTMLAttributes: в режиме
// «изображения выкл» рендерится <span>, и поведенческие пропсы (onClick, aria-*)
// молча исчезли бы. Сюда входит только то, что компонент действительно honors —
// попытка передать остальное становится ошибкой компиляции в месте вызова.
type BviImgProps = Pick<
  ImgHTMLAttributes<HTMLImageElement>,
  | 'src'
  | 'alt'
  | 'className'
  | 'style'
  | 'width'
  | 'height'
  | 'loading'
  | 'fetchPriority'
  | 'decoding'
  | 'srcSet'
  | 'sizes'
> & {
  /**
   * Показывать шиммер на месте картинки, пока она не загрузилась. По умолчанию
   * выключено намеренно: этим же компонентом рисуются иконки соцсетей и логотипы,
   * где мерцающая заглушка выглядит мусором. Включать для контентных изображений
   * (карточки событий и памяток, галерея события) — они тяжёлые и грузятся заметно.
   */
  skeleton?: boolean;
};

// В режиме «изображения выкл» (BVI) вместо картинки показываем блок того же размера
// с текстом alt — как в эталонном виджете bvi.isvek.ru. Иначе — обычный <img>.
export function BviImg({
  alt,
  className,
  style,
  width,
  height,
  skeleton = false,
  src,
  ...rest
}: BviImgProps) {
  const { enabled, images } = useBvi();

  // Храним ЗАГРУЖЕННЫЙ src, а не булев флаг: при смене src (React переиспользует
  // узел, если ключ прежний) состояние сбрасывается само — без useEffect и без
  // кадра, где шиммера уже нет, а новая картинка ещё не пришла.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const isLoaded = src != null && loadedSrc === src;

  const markLoaded = useCallback(() => setLoadedSrc(src ?? null), [src]);

  // Картинка из кэша успевает догрузиться до того, как React навесит onLoad, —
  // тогда событие не придёт вовсе и шиммер завис бы навсегда. Ref-колбэк ловит
  // этот случай: complete=true уже в момент монтирования узла.
  const captureCached = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete) setLoadedSrc(src ?? null);
    },
    [src],
  );

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

  return (
    <img
      alt={alt}
      src={src}
      className={[className, skeleton && !isLoaded ? styles.imgLoading : '']
        .filter(Boolean)
        .join(' ')}
      style={style}
      width={width}
      height={height}
      ref={skeleton ? captureCached : undefined}
      // onError тоже снимает шиммер: битая ссылка не должна мерцать вечно —
      // пусть лучше будет виден штатный «сломанный» вид картинки с alt.
      onLoad={skeleton ? markLoaded : undefined}
      onError={skeleton ? markLoaded : undefined}
      {...rest}
    />
  );
}
