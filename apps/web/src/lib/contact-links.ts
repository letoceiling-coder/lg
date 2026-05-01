/** Нормализует отображаемый телефон в href для tel: (+7…) */
export function telHref(display: string): string {
  let d = display.replace(/\D/g, '');
  if (!d.length) return 'tel:';
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
  if (d.length === 10) d = '7' + d;
  if (d.startsWith('7')) return `tel:+${d}`;
  return `tel:+${d}`;
}

/** Ссылка на Яндекс.Карты: координаты из настроек или поиск по адресу. */
export function yandexMapsHref(opts: {
  address?: string;
  officeLat?: string;
  officeLng?: string;
}): string | undefined {
  const lat = parseFloat(opts.officeLat ?? '');
  const lng = parseFloat(opts.officeLng ?? '');
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://yandex.ru/maps/?ll=${lng}%2C${lat}&z=17&pt=${lng}%2C${lat}&l=map`;
  }
  const addr = opts.address?.trim();
  if (addr) return `https://yandex.ru/maps/?text=${encodeURIComponent(addr)}`;
  return undefined;
}
