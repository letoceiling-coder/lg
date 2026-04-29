export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'RESERVED' | 'INACTIVE';

export const listingStatusOptions: Array<{ value: ListingStatus; label: string }> = [
  { value: 'DRAFT', label: 'Черновик' },
  { value: 'ACTIVE', label: 'Активно' },
  { value: 'RESERVED', label: 'Забронировано' },
  { value: 'SOLD', label: 'Продано' },
  { value: 'INACTIVE', label: 'Снято с публикации' },
];

export function listingStatusLabel(status?: string | null): string {
  return listingStatusOptions.find((option) => option.value === status)?.label ?? 'Неизвестно';
}

export function listingStatusClass(status?: string | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'RESERVED':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'SOLD':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'INACTIVE':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'DRAFT':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
