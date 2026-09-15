import ReactPaginateRaw from 'react-paginate';
import { useLayoutEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import './reactPaginate.css';

// react-paginate@8 поставляется как CJS с `{ default, __esModule }`. Под Vite
// дефолтный экспорт не всегда разворачивается, и компонент приходит объектом
// `{ default: fn, __esModule: true }` — React падает с "Element type is invalid".
// Разворачиваем дефолт здесь же и навешиваем классы по умолчанию, чтобы
// пагинация была одинаково стилизована на всех страницах.
const Base = ((ReactPaginateRaw as unknown as { default?: typeof ReactPaginateRaw }).default ??
  ReactPaginateRaw) as typeof ReactPaginateRaw;

type Props = ComponentProps<typeof ReactPaginateRaw>;

export default function ReactPaginate(props: Props) {
  const navRef = useRef<HTMLElement>(null);

  // Пакет рендерит `<ul role="navigation" aria-label="Pagination">`, и роль прибита
  // в самом createElement — пропсом её не снять. role="navigation" отменяет у <ul>
  // неявную роль списка, и все <li> внутри становятся для скринридера «сиротами»
  // (Lighthouse: listitem = 0 на /events). Поэтому landmark — наш <nav>, а у <ul>
  // роль и английскую подпись снимаем после рендера. React эти атрибуты обратно не
  // вернёт: он трогает DOM, только когда значение пропа меняется, а оно постоянное.
  // Эффект без зависимостей — на случай, если пакет перемонтирует <ul>.
  useLayoutEffect(() => {
    const list = navRef.current?.querySelector('ul');
    list?.removeAttribute('role');
    list?.removeAttribute('aria-label');
  });

  return (
    <nav ref={navRef} aria-label="Страницы">
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
        // Всё, что озвучивает скринридер, — по-русски; у пакета подписи по умолчанию
        // английские ("Previous page", "Page 3 is your current page", "Jump forward").
        // Типы ariaLabelBuilder врут: на деле он получает номер страницы с единицы и
        // булев флаг «текущая». «Текущая» в подпись не пишем — пакет сам ставит
        // активной ссылке aria-current="page", и скринридер скажет это сам.
        previousAriaLabel="Предыдущая страница"
        nextAriaLabel="Следующая страница"
        ariaLabelBuilder={(page) => `Страница ${page}`}
        breakAriaLabels={{
          forward: 'Перейти на несколько страниц вперёд',
          backward: 'Перейти на несколько страниц назад',
        }}
        {...props}
      />
    </nav>
  );
}
