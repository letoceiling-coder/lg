/**
 * Один скрипт Yandex Maps на вкладку. Ключ задаётся в админке → site_settings → integrations.
 * Первый вызов после загрузки страницы задаёт URL (включая apikey); повторные — тот же промис.
 */
let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    ymaps?: { ready: (cb: () => void) => void };
  }
}

function scriptUrl(apiKey: string | null): string {
  const p = new URLSearchParams({ lang: 'ru_RU' });
  if (apiKey?.trim()) p.set('apikey', apiKey.trim());
  return `https://api-maps.yandex.ru/2.1/?${p.toString()}`;
}

export function loadYandexMapsScript(apiKey: string | null): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.ymaps) {
    return new Promise((resolve) => {
      window.ymaps!.ready(() => resolve());
    });
  }
  if (!loadPromise) {
    const keyNorm = apiKey?.trim() ? apiKey.trim() : '';
    loadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.async = true;
      s.src = scriptUrl(keyNorm || null);
      s.dataset.yandexMaps = '1';
      s.onload = () => {
        if (window.ymaps) window.ymaps.ready(() => resolve());
        else resolve();
      };
      s.onerror = () => {
        loadPromise = null;
        reject(new Error('Не удалось загрузить Yandex Maps'));
      };
      document.head.appendChild(s);
    });
  }
  return loadPromise;
}
