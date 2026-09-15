import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes, CSSProperties, SyntheticEvent } from 'react';
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
   * Такие картинки ещё и обрывают свою загрузку при размонтировании (см. эффект ниже).
   */
  skeleton?: boolean;
  /**
   * Оборвать загрузку, пока картинка не догрузилась: снимаем src, и браузер отменяет
   * запрос. Уже загруженная картинка остаётся на месте. Нужен спискам на
   * keepPreviousData: после клика по году или странице старые карточки ещё на экране,
   * и их недокачанные картинки делят канал с запросом новой выборки — по замерам
   * ответ API ждал за ними 1–3 с вместо ~100 мс. Снимается и srcSet: иначе браузер
   * продолжил бы грузить картинку из него.
   */
  paused?: boolean;
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
  paused,
  src,
  srcSet,
  ...rest
}: BviImgProps) {
  const { enabled, images } = useBvi();

  // Факт загрузки нужен и шиммеру, и отмене: paused не должен снимать src с уже
  // загруженной картинки, а размонтирование — трогать догруженную.
  const tracksLoad = skeleton || paused !== undefined;

  // Храним ЗАГРУЖЕННЫЙ src, а не булев флаг: при смене src (React переиспользует
  // узел, если ключ прежний) состояние сбрасывается само — без useEffect и без
  // кадра, где шиммера уже нет, а новая картинка ещё не пришла.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const isLoaded = src != null && loadedSrc === src;

  // Последний смонтированный <img> — для отмены загрузки при размонтировании.
  // В null намеренно не сбрасываем: React вызывает ref(null) раньше, чем эффект
  // размонтирования, и тот остался бы без узла.
  const nodeRef = useRef<HTMLImageElement | null>(null);

  const markLoaded = useCallback(() => setLoadedSrc(src ?? null), [src]);

  // onError тоже снимает шиммер: битая ссылка не должна мерцать вечно — пусть лучше
  // будет виден штатный «сломанный» вид картинки с alt. Но если src сняли мы сами
  // (paused), это не ошибка загрузки: иначе картинка сочлась бы «готовой», src
  // вернулся бы на место и загрузка началась бы заново.
  const markFailed = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      if (e.currentTarget.hasAttribute('src')) setLoadedSrc(src ?? null);
    },
    [src],
  );

  // Картинка из кэша успевает догрузиться до того, как React навесит onLoad, —
  // тогда событие не придёт вовсе и шиммер завис бы навсегда. Ref-колбэк ловит
  // этот случай: complete=true уже в момент монтирования узла. У <img> без src
  // complete тоже true, поэтому наличие src проверяем явно.
  const captureNode = useCallback(
    (node: HTMLImageElement | null) => {
      if (!node) return;
      nodeRef.current = node;
      if (node.complete && node.hasAttribute('src')) setLoadedSrc(src ?? null);
    },
    [src],
  );

  const imagesOff = enabled && images === 'off';

  // Удаление <img> из DOM загрузку НЕ отменяет: по замерам картинки ушедшей выборки
  // докачивались до конца, хотя карточек на странице уже не было. Отменяет её
  // только снятие src. Очистка эффекта выполняется после того, как узел вынут из DOM;
  // проверка isConnected не даёт тронуть картинку, которая осталась на странице
  // (смена tracksLoad, двойной вызов эффектов в StrictMode). imagesOff в зависимостях —
  // потому что включение «изображения выкл» заменяет <img> на <span> без
  // размонтирования компонента, и без него скрытые картинки докачивались бы.
  useEffect(() => {
    if (!tracksLoad) return;
    return () => {
      const node = nodeRef.current;
      if (node && !node.isConnected && !node.complete) {
        node.removeAttribute('srcset');
        node.removeAttribute('src');
      }
    };
  }, [tracksLoad, imagesOff]);

  if (imagesOff) {
    const boxStyle: CSSProperties = { ...style };
    if (width != null) boxStyle.width = typeof width === 'number' ? `${width}px` : width;
    if (height != null) boxStyle.height = typeof height === 'number' ? `${height}px` : height;
    return (
      <span className={['bvi-img-off', className].filter(Boolean).join(' ')} style={boxStyle}>
        {alt || 'Нет описания к изображению'}
      </span>
    );
  }

  const held = paused && !isLoaded;

  return (
    <img
      alt={alt}
      src={held ? undefined : src}
      srcSet={held ? undefined : srcSet}
      className={[className, skeleton && !isLoaded ? styles.imgLoading : '']
        .filter(Boolean)
        .join(' ')}
      style={style}
      width={width}
      height={height}
      ref={tracksLoad ? captureNode : undefined}
      onLoad={tracksLoad ? markLoaded : undefined}
      onError={tracksLoad ? markFailed : undefined}
      {...rest}
    />
  );
}
