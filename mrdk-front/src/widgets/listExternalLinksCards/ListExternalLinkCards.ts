import SVOi from '../../shared/assets/SVOi_v2.png';
import cultureRF from '../../shared/assets/culture-rf.png';
import mkrf from '../../shared/assets/mkrf.png';
import oippi from '../../shared/assets/oippi_v2.png';
import ukmr from '../../shared/assets/ukmr_v2.png';
import departament from '../../shared/assets/departament_v2.png';
import gosuslugi from '../../shared/assets/gosuslugi.png';
import opros from '../../shared/assets/opros.png';
import grants from '../../shared/assets/grants.png';

export interface ListExternalLinkCardsItem {
  image: string;
  link: string;
  title?: string;
}

export const ListExternalLinkCards: ListExternalLinkCardsItem[] = [
  { image: SVOi, link: 'https://nt-kuzbass.ru/afisha/detail.php?ID=991', title: 'Поддержка участников специальной военной операции и их семей'},
  { image: cultureRF, link: 'https://www.culture.ru/', title: 'Культура.РФ' },
  { image: mkrf, link: 'https://culture.gov.ru/', title: 'Министерство культуры Российской федерации'},
  { image: oippi, link: 'http://www.pravo.gov.ru/', title: 'Официальный интернет-портал правовой информации'},
  { image: ukmr, link: 'https://markultura.ucoz.com/', title: '	Управление культуры Мариинского муниципального округа'},
  { image: departament, link: 'https://mincult-kuzbass.ru/', title: 'Департамент культуры и национальной политики Кемеровской области'},
  { image: gosuslugi, link: 'https://www.gosuslugi.ru/', title: 'Портал государственные услуги'},
  { image: opros, link: 'https://forms.mkrf.ru/e/2579/xTPLeBU7/?ap_orgcode=550160326', title: 'Опрос'},
  { image: grants, link: 'https://grants.culture.ru/', title: 'Гранты России'},
];