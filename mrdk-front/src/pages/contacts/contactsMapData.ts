export const DGIS_KEY = 'c5e4d7ec-f9d0-470f-b7f0-278f622f20e2';

export interface MapMarker {
  coordinates: [number, number];
  label: string;
}


export const mapMarkers: MapMarker[] = [
  { coordinates: [56.195409, 87.824616], label: 'МБУК «Районный Дом культуры» <br> ул. Весенняя, 13 <br> тел.: +7-923-031-89-35' },
  { coordinates: [56.231135, 87.91214], label: 'Приметкинский ДД <br> с. Приметкино ул. Центральная,64' },
  { coordinates: [56.176635, 87.875617], label: 'Раевский СДК <br> с. Раевка ул. Центральная, 19а' },
  { coordinates: [56.171329, 88.023528], label: 'Первомайский СДК <br> п. Первомайский ул. Весенняя,4' },
];
