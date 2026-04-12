export type CatalogHints = {
  complexes: Array<{
    id: number;
    slug: string;
    name: string;
    districtName: string | null;
    metroName: string | null;
    imageUrl: string | null;
  }>;
  metro: Array<{ id: number; name: string }>;
  districts: Array<{ id: number; name: string }>;
  streets: Array<{
    address: string;
    blockId: number;
    blockSlug: string;
    blockName: string;
  }>;
};

export function catalogHintsTotal(h: CatalogHints | undefined): number {
  if (!h) return 0;
  return h.complexes.length + h.metro.length + h.districts.length + h.streets.length;
}
