import { useMemo, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegionRow } from '@/redesign/hooks/useDefaultRegionId';

type Props = {
  regions?: RegionRow[];
  selectedRegionId?: number | null;
  onSelect: (regionId: number) => void;
  className?: string;
};

function isBelgorod(region: RegionRow): boolean {
  const code = (region.code ?? '').toLowerCase();
  const name = (region.name ?? '').toLowerCase();
  return code === 'belgorod' || name.includes('белгород');
}

function regionLabel(region: RegionRow): string {
  return region.name?.trim() || region.code || `Регион ${region.id}`;
}

const RegionSelector = ({ regions, selectedRegionId, onSelect, className }: Props) => {
  const [open, setOpen] = useState(false);
  const ordered = useMemo(() => {
    const rows = regions ?? [];
    const belgorod = rows.find(isBelgorod);
    const rest = rows
      .filter((r) => r.id !== belgorod?.id)
      .sort((a, b) => regionLabel(a).localeCompare(regionLabel(b), 'ru'));
    return belgorod ? [belgorod, ...rest] : rest;
  }, [regions]);
  const visible = ordered.slice(0, 6);
  const selected = ordered.find((r) => r.id === selectedRegionId);

  if (!ordered.length) return null;

  return (
    <div className={cn('relative min-w-0', className)}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {visible.map((region) => {
          const active = region.id === selectedRegionId;
          const belgorod = isBelgorod(region);
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => onSelect(region.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                active
                  ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm'
                  : belgorod
                    ? 'border-[#F97316] bg-[#F97316] text-white hover:bg-[#EA580C]'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/60',
              )}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {regionLabel(region)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
            open ? 'border-primary bg-accent text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground',
          )}
        >
          Все регионы
          {selected ? <span className="max-w-[120px] truncate text-[11px] opacity-75">· {regionLabel(selected)}</span> : null}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-[320px] min-w-[260px] overflow-y-auto rounded-xl border border-border bg-card py-1.5 shadow-lg">
          {ordered.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() => {
                onSelect(region.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-muted/50',
                region.id === selectedRegionId && 'font-medium text-primary',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  region.id === selectedRegionId ? 'bg-primary' : isBelgorod(region) ? 'bg-[#F97316]' : 'bg-muted-foreground/40',
                )}
              />
              {regionLabel(region)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default RegionSelector;
