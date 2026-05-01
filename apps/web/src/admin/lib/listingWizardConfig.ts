export type ListingWizardKind = 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL' | 'PARKING';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

export const houseTypeOptions = [
  { value: 'DETACHED', label: 'Отдельно стоящий' },
  { value: 'SEMI', label: 'Сблокированный / полудуплекс' },
  { value: 'TOWNHOUSE', label: 'Таунхаус' },
  { value: 'DUPLEX', label: 'Дуплекс' },
] as const satisfies readonly SelectOption[];

export const commercialTypeOptions = [
  { value: 'OFFICE', label: 'Офис' },
  { value: 'RETAIL', label: 'Магазин / торговое помещение' },
  { value: 'WAREHOUSE', label: 'Склад' },
  { value: 'RESTAURANT', label: 'Общепит' },
  { value: 'OTHER', label: 'Другое' },
] as const satisfies readonly SelectOption[];

export const parkingTypeOptions = [
  { value: 'UNDERGROUND', label: 'Подземный' },
  { value: 'GROUND', label: 'Наземный' },
  { value: 'MULTILEVEL', label: 'Многоуровневый' },
] as const satisfies readonly SelectOption[];

export const marketSegmentOptions = [
  { value: 'auto', label: 'Авто / не указано' },
  { value: 'NEW_BUILDING', label: 'Новостройка' },
  { value: 'SECONDARY', label: 'Вторичка' },
] as const satisfies readonly SelectOption[];

export const listingWizardKindLabels: Record<ListingWizardKind, { title: string; hint: string }> = {
  APARTMENT: { title: 'Квартира', hint: 'Жилая квартира в ЖК или вторичка' },
  HOUSE: { title: 'Дом', hint: 'Частный дом, таунхаус, дуплекс' },
  LAND: { title: 'Участок', hint: 'Земельный участок (ИЖС, СНТ)' },
  COMMERCIAL: { title: 'Коммерция', hint: 'Офис, магазин, склад' },
  PARKING: { title: 'Паркинг', hint: 'Машиноместо' },
};

export const listingWizardRequiredAreaLabel: Record<ListingWizardKind, string> = {
  APARTMENT: 'Площадь квартиры, м²',
  HOUSE: 'Площадь дома, м²',
  LAND: 'Площадь участка, сот.',
  COMMERCIAL: 'Площадь помещения, м²',
  PARKING: 'Площадь машино-места, м²',
};

export const listingWizardMediaLabels: Record<ListingWizardKind, { main: string; gallery: string; plan?: string }> = {
  APARTMENT: { main: 'Главное фото / отделка', gallery: 'Галерея квартиры', plan: 'Планировка' },
  HOUSE: { main: 'Главное фото дома', gallery: 'Галерея дома' },
  LAND: { main: 'Главное фото участка', gallery: 'Галерея участка' },
  COMMERCIAL: { main: 'Главное фото помещения', gallery: 'Галерея помещения' },
  PARKING: { main: 'Главное фото машино-места', gallery: 'Галерея паркинга' },
};

export function optionLabel(
  options: readonly SelectOption[],
  value: string | null | undefined,
  fallback = '—',
): string {
  if (!value) return fallback;
  return options.find((option) => option.value === value)?.label ?? value;
}
