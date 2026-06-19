import type { SocialLink } from './typesLinks';
import vkLogo from '../assets/vk_logo.svg';
import okLogo from '../assets/odnoklassniki_logo.svg';

export const socialLinks: SocialLink[] = [
    {
        href: 'https://vk.com/id532490310',
        icon: vkLogo,
        label: 'Вконтакте',
        ariaLabel: 'Перейти на страницу Вконтакте',
        target: '_blank',
        rel: 'noopener noreferrer',
    },
    {
        href: 'https://ok.ru/profile/581571112868',
        icon: okLogo,
        label: 'Одноклассники',
        ariaLabel: 'Перейти на страницу Одноклассники',
        target: '_blank',
        rel: 'noopener noreferrer',
    },
];