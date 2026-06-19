export type InternalLink = {
    type: 'internal';
    path: string;
    label: string;
};

export type ExternalLink = {
    type: 'external';
    href: string;
    label: string;
    target: '_blank';
    rel: 'noopener noreferrer';
};

export interface SocialLink {
    label: string;
    href: string;
    ariaLabel: string;
    target: '_blank';
    rel: 'noopener noreferrer';
    icon: string;
}

export type NavLinkItem = InternalLink | ExternalLink;
export type FooterLink = InternalLink;