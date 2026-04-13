import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'LiveGrid';
const SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/+$/, '') || 'https://lg.livegrid.ru';

type SeoMeta = {
  title: string;
  description: string;
  noindex?: boolean;
};

function ensureMetaByName(name: string): HTMLMetaElement {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  return meta;
}

function ensureMetaByProperty(property: string): HTMLMetaElement {
  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  return meta;
}

function ensureCanonical(): HTMLLinkElement {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  return link;
}

function buildMeta(pathname: string): SeoMeta {
  if (pathname === '/') {
    return {
      title: 'Недвижимость в России',
      description: 'Каталог жилых комплексов и квартир: фильтры, карты, избранное и подборки.',
    };
  }
  if (pathname.startsWith('/catalog')) {
    return {
      title: 'Каталог недвижимости',
      description: 'Подбор ЖК и квартир по цене, району, метро и другим параметрам.',
    };
  }
  if (pathname.startsWith('/complex/')) {
    return {
      title: 'Страница жилого комплекса',
      description: 'Описание ЖК, квартиры, планировки, шахматка и инфраструктура.',
    };
  }
  if (pathname.startsWith('/apartment/')) {
    return {
      title: 'Карточка квартиры',
      description: 'Параметры квартиры, планировка, цена и связанные объекты.',
    };
  }
  if (pathname === '/map') {
    return {
      title: 'Поиск на карте',
      description: 'Поиск жилых комплексов и объектов на интерактивной карте.',
    };
  }
  if (pathname.startsWith('/news')) {
    return {
      title: 'Новости недвижимости',
      description: 'Актуальные новости и статьи о рынке недвижимости и проектах.',
    };
  }
  if (pathname === '/contacts') {
    return {
      title: 'Контакты',
      description: 'Контакты команды LiveGrid и форма обратной связи.',
    };
  }
  if (pathname === '/privacy') {
    return {
      title: 'Политика конфиденциальности',
      description: 'Условия обработки персональных данных на платформе LiveGrid.',
    };
  }
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/favorites')
  ) {
    return {
      title: 'Служебный раздел',
      description: 'Служебный раздел платформы LiveGrid.',
      noindex: true,
    };
  }
  return {
    title: 'Платформа недвижимости',
    description: 'LiveGrid: платформа управления и поиска недвижимости.',
  };
}

export default function SeoRouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = buildMeta(pathname);
    const fullTitle = `${meta.title} | ${SITE_NAME}`;
    const canonicalUrl = `${SITE_URL}${pathname}`;

    document.title = fullTitle;

    ensureMetaByName('description').setAttribute('content', meta.description);
    ensureMetaByName('robots').setAttribute(
      'content',
      meta.noindex ? 'noindex, nofollow' : 'index, follow',
    );

    ensureMetaByProperty('og:title').setAttribute('content', fullTitle);
    ensureMetaByProperty('og:description').setAttribute('content', meta.description);
    ensureMetaByProperty('og:url').setAttribute('content', canonicalUrl);

    ensureMetaByName('twitter:title').setAttribute('content', fullTitle);
    ensureMetaByName('twitter:description').setAttribute('content', meta.description);

    ensureCanonical().setAttribute('href', canonicalUrl);
  }, [pathname]);

  return null;
}
