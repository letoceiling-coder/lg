import { Fragment, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { Apartment } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';

interface Props {
  apartments: Apartment[];
  floors: number;
  sections: number;
  buildingName: string;
}

type StatusKey = Apartment['status'];

const STATUS_LABEL: Record<StatusKey, string> = {
  available: 'Свободна',
  reserved: 'Бронь',
  sold: 'Продана',
};

const STATUS_BG: Record<StatusKey, string> = {
  available: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white',
  reserved: 'bg-zinc-700 hover:bg-zinc-600 border-zinc-600 text-white',
  sold: 'bg-zinc-300 border-zinc-200 text-zinc-700',
};

const SWATCH_BG: Record<StatusKey, string> = {
  available: 'bg-zinc-900 border-zinc-700',
  reserved: 'bg-zinc-700 border-zinc-600',
  sold: 'bg-zinc-300 border-zinc-200',
};

const STATUS_ORDER: StatusKey[] = ['available', 'reserved', 'sold'];

const Chessboard = ({ apartments, floors, sections, buildingName }: Props) => {
  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { available: 0, reserved: 0, sold: 0 };
    for (const a of apartments) {
      const s = (a.status as StatusKey) ?? 'available';
      if (s in c) c[s] += 1;
    }
    return c;
  }, [apartments]);

  const [activeStatuses, setActiveStatuses] = useState<Set<StatusKey>>(
    () => new Set<StatusKey>(['available', 'reserved', 'sold']),
  );

  const toggleStatus = (s: StatusKey) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size > 1) next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  };

  const byFloor = useMemo(() => {
    const m = new Map<number, Apartment[]>();
    for (const a of apartments) {
      const arr = m.get(a.floor) ?? [];
      arr.push(a);
      m.set(a.floor, arr);
    }
    m.forEach((arr) => arr.sort((x, y) => (x.section ?? 1) - (y.section ?? 1)));
    return m;
  }, [apartments]);

  const maxFloor = floors > 0 ? floors : (apartments.length ? Math.max(...apartments.map((a) => a.floor || 1)) : 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-sm">{buildingName}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {STATUS_ORDER.map((s) => {
            const isActive = activeStatuses.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors',
                  isActive
                    ? 'border-foreground/20 bg-background text-foreground'
                    : 'border-transparent bg-muted/40 text-muted-foreground hover:text-foreground',
                )}
              >
                <span className={cn('w-3 h-3 rounded border', SWATCH_BG[s])} />
                <span>{STATUS_LABEL[s]}</span>
                <span className="ml-1 text-muted-foreground">{counts[s]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-3">
        <div className="min-w-[760px] space-y-1.5">
          {Array.from({ length: maxFloor }, (_, fi) => {
            const floor = maxFloor - fi;
            const row = (byFloor.get(floor) ?? []).filter((a) => activeStatuses.has(a.status));
            return (
              <div key={`row-${floor}`} className="grid grid-cols-[44px_1fr] gap-1.5">
                <div className="flex items-center justify-center text-xs text-muted-foreground font-medium rounded-lg bg-muted/30 border border-border/40">
                  {floor}
                </div>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(108px, 1fr))` }}>
                  {row.length === 0 && <div className="h-16 rounded-lg border border-border/40 bg-muted/20" />}
                  {row.map((apt) => {
                    const roomLabel = apt.rooms === 0 ? 'Ст' : `${apt.rooms}к`;
                    const sec = apt.section ?? 1;
                    const statusLabel = STATUS_LABEL[apt.status];
                    const card = (
                      <div className={cn('h-16 rounded-lg border px-2 py-1 text-[10px] leading-tight transition-colors', STATUS_BG[apt.status])}>
                        <div className="font-semibold">{roomLabel} · {apt.area}м²</div>
                        <div className="opacity-90">{formatPrice(apt.price)}</div>
                        <div className="opacity-70">секц. {sec} · {statusLabel}</div>
                      </div>
                    );
                    if (apt.status === 'sold') return <div key={apt.id}>{card}</div>;
                    return <Link key={apt.id} to={`/apartment/${apt.id}`}>{card}</Link>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Chessboard;
