import type { NavLinkItem } from './typesLinks';

export const headerLinks: NavLinkItem[] = [
  { type: 'internal', path: '/', label: 'Главная' },
  { type: 'internal', path: '/events', label: 'События' },
  {
    type: 'external',
    href: 'https://www.culture.ru/afisha/kemerovskaya-oblast-kuzbass/institute-57961-mariinskii-raionnyi-dom-kultury',
    label: 'Афиша',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  {
    type: 'internal',
    path: '/clubs',
    label: 'Клубы'
  },
  {
    type: 'internal',
    path: '/workplan',
    label: 'План работы',
  },
  {
    type: 'internal',
    path: '/documents',
    label: 'Документы',
  },
  {
    type: 'internal',
    path: '/reminders',
    label: 'Памятки'
  },
  {
    type: 'internal',
    path: '/anticorruption',
    label: 'Противодействие коррупции',
  },
  {
    type: 'internal',
    path: '/contacts',
    label: 'Контакты',
  },
];