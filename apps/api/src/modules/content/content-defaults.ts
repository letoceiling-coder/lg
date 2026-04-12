import { SiteSettingFieldType } from '@prisma/client';

/** Значения по умолчанию для главной (совпадают с packages/database/prisma/seed.ts). */
export const DEFAULT_HOMEPAGE_SITE_SETTINGS: Array<{
  key: string;
  value: string;
  groupName: string;
  label: string;
  fieldType: SiteSettingFieldType;
  sortOrder: number;
}> = [
  {
    key: 'home_hot_title',
    value: 'Горячие предложения',
    groupName: 'homepage',
    label: 'Заголовок блока «Горячие предложения»',
    fieldType: SiteSettingFieldType.TEXT,
    sortOrder: 0,
  },
  {
    key: 'home_hot_per_page',
    value: '8',
    groupName: 'homepage',
    label: 'Сколько карточек в «Горячих предложениях»',
    fieldType: SiteSettingFieldType.TEXT,
    sortOrder: 1,
  },
  {
    key: 'home_hot_mode',
    value: 'latest',
    groupName: 'homepage',
    label:
      'Режим горячих: latest — последние ЖК с офферами; promoted — только «Реклама»; fixed_slugs — список slug ниже',
    fieldType: SiteSettingFieldType.TEXT,
    sortOrder: 2,
  },
  {
    key: 'home_hot_fixed_slugs',
    value: '',
    groupName: 'homepage',
    label: 'Фиксированные slug ЖК (через запятую), если режим fixed_slugs',
    fieldType: SiteSettingFieldType.TEXTAREA,
    sortOrder: 3,
  },
  {
    key: 'home_hot_badge',
    value: 'Горячее предложение',
    groupName: 'homepage',
    label: 'Текст бейджа на карточке «Горячие»',
    fieldType: SiteSettingFieldType.TEXT,
    sortOrder: 4,
  },
  {
    key: 'home_start_title',
    value: 'Старт продаж',
    groupName: 'homepage',
    label: 'Заголовок блока «Старт продаж»',
    fieldType: SiteSettingFieldType.TEXT,
    sortOrder: 10,
  },
  {
    key: 'home_start_per_page',
    value: '8',
    groupName: 'homepage',
    label: 'Сколько карточек в «Старте продаж»',
    fieldType: SiteSettingFieldType.TEXT,
    sortOrder: 11,
  },
  {
    key: 'home_start_window_days',
    value: '365',
    groupName: 'homepage',
    label: 'Окно дней: дата старта продаж от сегодня до +N дней',
    fieldType: SiteSettingFieldType.TEXT,
    sortOrder: 12,
  },
  {
    key: 'home_start_badge',
    value: 'Старт продаж',
    groupName: 'homepage',
    label: 'Текст бейджа «Старт продаж»',
    fieldType: SiteSettingFieldType.TEXT,
    sortOrder: 13,
  },
  {
    key: 'home_news_per_page',
    value: '4',
    groupName: 'homepage',
    label: 'Сколько новостей в блоке на главной',
    fieldType: SiteSettingFieldType.TEXT,
    sortOrder: 20,
  },
];

/** Стабильные обложки (picsum по seed = не меняются между деплоями). */
export const DEFAULT_DEMO_NEWS: Array<{
  slug: string;
  title: string;
  body: string;
  source: string;
  imageUrl: string | null;
}> = [
  {
    slug: 'obzor-novostroek-moskvy-2026',
    title: 'Обзор новостроек Москвы: что выбрать',
    body: '<p>Краткий обзор рынка новостроек Москвы и Московской области.</p>',
    source: 'Обзор',
    imageUrl: 'https://picsum.photos/seed/livegrid-news-obzor/800/480',
  },
  {
    slug: 'ipoteka-stavki-snizheny-2026',
    title: 'Ипотечные ставки снижены до 6%',
    body: '<p>Обзор актуальных ипотечных программ и условий банков.</p>',
    source: 'Ипотека',
    imageUrl: 'https://picsum.photos/seed/livegrid-news-ipoteka/800/480',
  },
  {
    slug: 'novyj-zhk-na-yuge-moskvy',
    title: 'Новый жилой комплекс на юге Москвы',
    body: '<p>Анонс нового проекта на юге столицы.</p>',
    source: 'Новостройки',
    imageUrl: 'https://picsum.photos/seed/livegrid-news-zhk/800/480',
  },
  {
    slug: 'kak-vybrat-kvartiru-sovety',
    title: 'Как выбрать квартиру: советы экспертов',
    body: '<p>Практические рекомендации при выборе квартиры в новостройке.</p>',
    source: 'Советы',
    imageUrl: 'https://picsum.photos/seed/livegrid-news-sovety/800/480',
  },
  {
    slug: 'rynok-novostroek-prognoz-2026',
    title: 'Прогноз по рынку новостроек на 2026 год',
    body: '<p>Что ждёт покупателей: спрос, цены и география запусков.</p>',
    source: 'Аналитика',
    imageUrl: 'https://picsum.photos/seed/livegrid-news-analitika/800/480',
  },
  {
    slug: 'samoletnye-programmy-rassrochki',
    title: 'Рассрочка и trade-in: какие программы актуальны',
    body: '<p>Краткий обзор условий застройщиков и банковских партнёров.</p>',
    source: 'Финансы',
    imageUrl: 'https://picsum.photos/seed/livegrid-news-finance/800/480',
  },
];
