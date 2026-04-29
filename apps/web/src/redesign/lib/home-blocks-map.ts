import type { PropertyData } from '@/components/PropertyCard';
import type { StartSaleData } from '@/components/StartSaleCard';
import type { ApiBlockListRow } from '@/redesign/lib/blocks-from-api';
import { MIN_REASONABLE_PRICE_RUB } from '@/redesign/data/mock-data';

const PLACEHOLDER = '/placeholder.svg';

export function formatListingPriceMinRub(rub: number | null | undefined): string {
  if (rub == null || !Number.isFinite(rub) || rub < MIN_REASONABLE_PRICE_RUB) return '—';
  const m = rub / 1_000_000;
  if (m >= 1) {
    const s = m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '');
    return `от ${s} млн`;
  }
  return `от ${Math.round(rub / 1000)} тыс ₽`;
}

export function blockMainImage(b: ApiBlockListRow): string {
  const u = b.images?.[0]?.url?.trim();
  return u ? u : PLACEHOLDER;
}

export function blockAddressLine(b: ApiBlockListRow): string {
  const addr = b.addresses?.[0]?.address?.trim();
  if (addr) return addr;
  const r = b.region?.name?.trim();
  const d = b.district?.name?.trim();
  if (r && d) return `${r}, ${d}`;
  return r || d || '—';
}

export function formatSalesStartLabel(iso: string | Date | null | undefined): string {
  if (iso == null) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return `Старт продаж: ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export function mapApiBlockToHomeHotCard(b: ApiBlockListRow, badge: string): PropertyData {
  const bdg = badge.trim();
  const metroNotes = (b.subways ?? [])
    .filter((x) => Boolean(x?.subway?.name))
    .slice(0, 2)
    .map((x) => ({
      name: x.subway.name,
      time: x.distanceTime ?? null,
      by: x.distanceType === 1 ? 'walk' : 'transport',
    }));
  return {
    image: blockMainImage(b),
    title: b.name,
    price: formatListingPriceMinRub(b.listingPriceMin ?? null),
    address: blockAddressLine(b),
    district: b.district?.name ?? undefined,
    developer: b.builder?.name ?? undefined,
    deadline: formatSalesStartLabel(b.salesStartDate ?? null) || undefined,
    listingCount: b._count?.listings ?? 0,
    metroNotes,
    slug: b.slug,
    badges: bdg ? [bdg] : [],
  };
}

export function mapApiBlockToHomeStartCard(b: ApiBlockListRow, badge: string): StartSaleData {
  const bdg = badge.trim();
  const label = formatSalesStartLabel(b.salesStartDate ?? null);
  return {
    image: blockMainImage(b),
    title: b.name,
    price: formatListingPriceMinRub(b.listingPriceMin ?? null),
    address: blockAddressLine(b),
    district: b.district?.name ?? undefined,
    developer: b.builder?.name ?? undefined,
    slug: b.slug,
    badges: bdg ? [bdg] : ['Старт продаж'],
    apartments: [],
    listingCount: b._count?.listings ?? 0,
    salesStartLabel: label || undefined,
    metroNotes: (b.subways ?? [])
      .filter((x) => Boolean(x?.subway?.name))
      .slice(0, 3)
      .map((x) => ({
        name: x.subway.name,
        time: x.distanceTime ?? null,
        by: x.distanceType === 1 ? 'walk' : 'transport',
      })),
  };
}
