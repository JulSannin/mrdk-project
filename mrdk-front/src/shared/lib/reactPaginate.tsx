import ReactPaginateRaw from 'react-paginate';
import type { ComponentProps } from 'react';
import './reactPaginate.css';

// react-paginate@8 поставляется как CJS с `{ default, __esModule }`. Под Vite
// дефолтный экспорт не всегда разворачивается, и компонент приходит объектом
// `{ default: fn, __esModule: true }` — React падает с "Element type is invalid".
// Разворачиваем дефолт здесь же и навешиваем классы по умолчанию, чтобы
// пагинация была одинаково стилизована на всех страницах.
const Base = ((ReactPaginateRaw as unknown as { default?: typeof ReactPaginateRaw })
  .default ?? ReactPaginateRaw) as typeof ReactPaginateRaw;

type Props = ComponentProps<typeof ReactPaginateRaw>;

export default function ReactPaginate(props: Props) {
  return (
    <Base
      containerClassName="pagination"
      pageClassName="pagination__item"
      pageLinkClassName="pagination__link"
      activeClassName="pagination__item--active"
      previousClassName="pagination__item pagination__item--nav"
      nextClassName="pagination__item pagination__item--nav"
      previousLinkClassName="pagination__link"
      nextLinkClassName="pagination__link"
      breakClassName="pagination__item pagination__item--break"
      breakLinkClassName="pagination__link"
      disabledClassName="pagination__item--disabled"
      {...props}
    />
  );
}
