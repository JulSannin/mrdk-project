# Ревью кода `mrdk-front`

Дата: 2026-06-30 · Ревьюер: Claude · Объём: ~3 570 строк TS/TSX, 115 файлов в `src`
Состояние на момент ревью: `tsc -b` ✅, `vitest run` ✅ (4 теста).

Главный вопрос ревью: **«нет ли переусложнений?»**

---

## TL;DR

Код **в целом не переусложнён**. Структура FSD (`app / pages / widgets / entities / shared`)
выдержана, слои не протекают, комментарии объясняют именно неочевидное (фокус‑менеджмент,
2ГИС‑thenable, CJS/ESM‑интероп, пререндер меты). Сложность, которая есть, в большинстве мест
**оправдана требованиями** (доступность/БВИ, SEO для CSR‑SPA, интеграция стороннего скрипта).

Реальных «переусложнений» немного — по сути одно заметное (логика подсчёта карточек на главной).
Гораздо больше потенциала в **устранении дублирования** виджетов и в паре **фактических багов**
в контактных данных. Ниже — по приоритету.

---

## 1. Настоящие переусложнения

### 1.1. Главная: подсчёт колонок через `getComputedStyle` + `ResizeObserver` ⚠️ главное
[src/pages/home/HomePage.tsx:15-46](src/pages/home/HomePage.tsx#L15-L46)

`cardsForColumns()` читает `getComputedStyle(el).gridTemplateColumns`, считает число колонок,
а внутри ещё и сверяется с `window.innerWidth <= 767 / < 1280` — то есть **брейкпоинты CSS
продублированы магическими числами в JS**, плюс живой `ResizeObserver` на сетке.

Цель (показать «целое число рядов») достижима чистым CSS — без JS, без ResizeObserver, без
рассинхрона с медиазапросами:

```css
/* показываем максимум, лишние прячем по тем же брейкпоинтам, что и колонки */
.grid > li:nth-child(n + 9)  { display: none; }            /* база: 2 ряда по 4 */
@media (min-width: 1280px)   { .grid > li:nth-child(n + 13){ display:none } } /* 4×3 */
```

Это убирает ~25 строк JS, `useState/useRef/useCallback/useEffect` и связку JS↔CSS.
Самый явный кандидат на упрощение во всём публичном сайте.

### 1.2. Система меты + пререндер — на грани «оправданно, но тяжело»
[src/shared/lib/useDocumentTitle.ts](src/shared/lib/useDocumentTitle.ts) ·
[src/shared/config/siteMeta.ts](src/shared/config/siteMeta.ts) ·
[vite.config.ts:16-42](vite.config.ts#L16-L42)

`STATIC_ROUTES` как единый источник для роутера и пререндера — это **правильное** решение, не
переусложнение. Отмечаю лишь как самый «дорогой» по сложности узел: regex‑подмена тегов в собранном
`index.html`. Для сайта из ~9 статических маршрутов работает и читается — оставить как есть, просто
держать в голове как точку хрупкости (поломается, если в `index.html` поменяется разметка og‑тегов).

### Что НЕ является переусложнением (специально проверял)
- **БВИ** (`BviContext`/`BviPanel`/`BviImg` + data‑атрибуты на `<html>`) — объёмно, но это
  юридическое требование для муниципального сайта (версия для слабовидящих). Архитектура через
  data‑атрибуты + CSS — как раз правильная, компоненты ничего не знают про БВИ. Оставить.
- **`load2gis`** — thenable‑DG, кэш промиса, типы. Сложность присуща интеграции глобального
  скрипта, хорошо изолирована и прокомментирована. Оставить.
- **`reactPaginate.tsx`** — разворачивание CJS‑дефолта и централизация классов. Оправдано.
- **`dataProvider.findInList`** — постраничный обход для `getOne` download‑ресурсов. Документировано,
  есть причина (GET /:id отдаёт файл). Оставить.

---

## 2. Дублирование, которое стоит убрать (наибольшая отдача)

### 2.1. Три почти одинаковых «соцсетей» виджета
[NavSocialMedia.tsx](src/widgets/header/NavSocialMedia.tsx) ·
[BurgerMenuSocialMedia.tsx](src/widgets/header/burger-menu/BurgerMenuSocialMedia.tsx) ·
[FooterSocialMedia.tsx](src/widgets/footer/FooterSocialMedia.tsx)

Все три мапят `socialLinks` и рендерят `<a><BviImg/></a>`; отличие — только класс обёртки/ссылки.
→ один `shared/ui/SocialLinks` с пропсами `className`/`linkClassName` (или `variant`). Минус 2 файла.

### 2.2. Две почти одинаковых «ссылки навигации»
[NavLinks.tsx](src/widgets/header/NavLinks.tsx) ·
[BurgerMenuLinks.tsx](src/widgets/header/burger-menu/BurgerMenuLinks.tsx)

Идентичная логика `internal/external` с `NavLink`/`<a target=_blank>`, отличаются только имена
классов. → один компонент с настройкой классов.

### 2.3. `footerLinks` — это `headerLinks` без внешней «Афиши»
[footerLinksData.ts](src/shared/navigation/footerLinksData.ts) vs
[headerLinksData.ts](src/shared/navigation/headerLinksData.ts)

Два ручных списка, которые надо синхронизировать. → выводить футер из шапки:
`export const footerLinks = headerLinks.filter(l => l.type === 'internal')`. Один источник правды.

### 2.4. `<ExternalLinkCards/>` + `<VideoBlock/>` в подвале каждой публичной страницы
Повторяется в 9 страницах, плюс в 5 страницах в ветке `if (isError) return <>…<ExternalLinkCards/></>`.

→ Перенести оба блока **один раз в `RootLayout`** сразу после `<Outlet/>`
([src/app/root.tsx:76-79](src/app/root.tsx#L76-L79)). Тогда из всех 9 страниц уходят повторяющиеся
импорты и JSX, а на экранах ошибок блоки появляются автоматически. Это и упрощение, и меньше шансов
забыть их на новой странице.

### 2.5. Админка: три копии «карточка с кнопкой удаления» на инлайн‑стилях
[src/pages/admin/resources/events.tsx:29-180](src/pages/admin/resources/events.tsx#L29-L180)

`GalleryManager`, `VideoManager`, `CurrentMainImage` — почти один и тот же блок, а стиль красной
кнопки `{position:'absolute', top:4, right:4, …}` скопирован дословно **3 раза**. `GalleryManager` и
`VideoManager` различаются лишь `img`↔`video` и эндпоинтом. → один `<DeletableMediaGrid kind="image|video">`
+ вынести повторяющиеся инлайн‑стили в CSS‑модуль/константу. Самый «грязный» по дублированию файл.

### 2.6. `CurrentFile` дублируется в двух ресурсах
[workplan.tsx:17-29](src/pages/admin/resources/workplan.tsx#L17-L29) и
[documents.tsx:9-21](src/pages/admin/resources/documents.tsx#L9-L21) — идентичны до эндпоинта.
→ один общий компонент `CurrentFile({ resource })`.

---

## 3. Фактические баги, найденные попутно (не про сложность, но важно)

### 3.1. 🐞 Опечатка в e‑mail в подвале
[src/widgets/footer/FooterContacts.tsx:29](src/widgets/footer/FooterContacts.tsx#L29)
```
href="mailto:rbk-pristan@mail.ru"   ← rbk
текст ссылки: rdk-pristan@mail.ru    ← rdk
```
Письмо уходит на **несуществующий** адрес (`rbk` вместо `rdk`). Поправить href.

### 3.2. 🐞 Контактные данные расходятся и местами невалидны
Хардкод одних и тех же контактов в 3+ местах с разными значениями:
- [ContactsPage.tsx:17](src/pages/contacts/ContactsPage.tsx#L17): телефон `8 (38443) 5-02-82`
- [FooterContacts.tsx:38](src/widgets/footer/FooterContacts.tsx#L38): телефон `+8-923-031-89-35` —
  **формат невалиден** (должно быть `+7…` или `8…`, не `+8`)
- [contactsMapData.ts:10](src/pages/contacts/contactsMapData.ts#L10): телефон `+7-923-031-89-35`

Три разных телефона/адреса без единого источника → они уже разъехались. → вынести контакты в один
`shared/config/contacts.ts` и тянуть оттуда и в подвал, и на страницу, и в маркеры карты.

### 3.3. ⚠️ `SITE_ORIGIN = 'https://nn-lance.ru'` похоже на чужой/временный домен
[siteMeta.ts:7](src/shared/config/siteMeta.ts#L7), а также
[index.html:27-28](index.html#L27-L28) (`og:url`, `og:image`) и `public/robots.txt` (`Sitemap:`).
Для сайта Мариинского РДК домен выглядит как placeholder. Бьёт по SEO (og/canonical/sitemap указывают
на сторонний хост). Проверить и заменить на боевой домен (или вынести в env, как уже сделано для
`VITE_YM_COUNTER_ID`).

---

## 4. Мелочи и консистентность стиля

- **Опечатка в имени функции:** `export function   ContactsMap` (лишние пробелы)
  [ContactsMap.tsx:8](src/pages/contacts/ContactsMap.tsx#L8).
- **Лишний `memo`** на `NavBar`/`FooterLinks`/`VideoBlock`/`ExternalLinkCards` — пропсов нет, входные
  данные статичны; выгоды ноль, это «карго‑культ» оптимизации. Можно снять (не вредно, но шум).
- **Смешанные отступы:** виджеты header/footer, `authProvider.ts`, `LoginPage.tsx` — 4 пробела,
  остальное — 2. Прогнать Prettier/единый конфиг.
- **Смешанные `export default` vs именованные** для компонентов (`EventCard`, `VideoBlock`,
  `ExternalLinkCards` — default; entity‑карточки — named). Стоит выбрать одно.
- **`interface Document`** [entities/types.ts:34](src/entities/types.ts#L34) перекрывает глобальный
  DOM‑тип `Document` в модулях, где импортируется. Работает, но лучше `DocumentItem`.
- **`DGIS_KEY` захардкожен** в исходнике [contactsMapData.ts:1](src/pages/contacts/contactsMapData.ts#L1).
  Ключ клиентский/публичный, риск низкий, но непоследовательно относительно env‑подхода метрики.
- **`else` после `return`** в `NavLinks`/`BurgerMenuLinks` — можно убрать ветку `else` (косметика).

---

## 5. Предостережение: где НЕ надо «упрощать» через абстракцию

Списковые страницы (`EventsPage`, `RemindersPage`, `DocumentsPage`, `WorkPlanPage`, `ClubsPage`)
повторяют каркас `useQuery → скелетон → ошибка → пагинация → сетка`. Соблазн сделать один
generic‑`<ResourceList>` есть, но различия существенные: фильтр по году, модалка просмотра,
группировка по годам, таблица vs сетка, разные `LIMIT`. **Обобщать не рекомендую** — получится
«God‑компонент» с десятком флагов, что хуже текущего явного дублирования. Максимум — вынести общий
хук пагинации из URL (`?page` парсинг + `goToPage`), он буквально совпадает в Events/Reminders.

---

## 6. План действий по приоритету

| # | Что | Тип | Усилие | Эффект |
|---|-----|-----|--------|--------|
| 1 | Поправить `mailto:rbk→rdk` (3.1) | bug | 1 мин | критично |
| 2 | Свести контакты в один источник, починить `+8` (3.2) | bug/дубль | 30 мин | высокий |
| 3 | Проверить/заменить `nn-lance.ru` (3.3) | bug/SEO | 10 мин | высокий |
| 4 | `ExternalLinkCards`+`VideoBlock` → в `RootLayout` (2.4) | упрощение | 20 мин | высокий |
| 5 | Упростить главную на CSS, убрать ResizeObserver (1.1) | переусложн. | 30 мин | средний |
| 6 | Объединить соц‑виджеты и nav‑ссылки (2.1, 2.2) | дубль | 30 мин | средний |
| 7 | `footerLinks` вывести из `headerLinks` (2.3) | дубль | 5 мин | средний |
| 8 | Дедуп админ‑медиа и `CurrentFile` (2.5, 2.6) | дубль | 40 мин | средний |
| 9 | Косметика: отступы, `memo`, имена, опечатки (4) | стиль | 20 мин | низкий |

**Вывод:** архитектура здоровая, переусложнений почти нет. Основная работа — не «упрощать сложное»,
а **убрать дублирование виджетов** и **починить разъехавшиеся контактные данные**.
