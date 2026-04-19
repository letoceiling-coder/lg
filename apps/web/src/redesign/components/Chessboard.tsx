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
  available: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-800',
  reserved: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800',
  sold: 'bg-muted border-border text-muted-foreground',
};

const SWATCH_BG: Record<StatusKey, string> = {
  available: 'bg-green-100 border-green-200',
  reserved: 'bg-amber-100 border-amber-200',
  sold: 'bg-muted border-border',
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

  const grid = useMemo(() => {
    const map = new Map<string, Apartment>();
    apartments.forEach((a) => {
      map.set(`${a.floor}-${a.section}`, a);
    });
    return map;
  }, [apartments]);

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
                title={`Показать «${STATUS_LABEL[s]}»`}
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
        <div
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `48px repeat(${sections}, minmax(90px, 1fr))` }}
        >
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-center">Эт.</div>
          {Array.from({ length: sections }, (_, s) => (
            <div key={s} className="text-xs text-muted-foreground font-medium text-center py-1.5">
              Секц. {s + 1}
            </div>
          ))}

          {Array.from({ length: floors }, (_, fi) => {
            const floor = floors - fi;
            return (
              <Fragment key={`row-${floor}`}>
                <div className="text-xs text-muted-foreground flex items-center justify-center font-medium">
                  {floor}
                </div>
                {Array.from({ length: sections }, (_, s) => {
                  const apt = grid.get(`${floor}-${s + 1}`);
                  if (!apt) {
                    return (
                      <div
                        key={`${floor}-${s}`}
                        className="h-14 bg-muted/30 rounded-lg border border-border/30"
                      />
                    );
                  }
                  const status = (apt.status as StatusKey) ?? 'available';
                  const visible = activeStatuses.has(status);
                  const interactive = visible && status !== 'sold';
                  return (
                    <Link
                      key={`${floor}-${s}`}
                      to={interactive ? `/apartment/${apt.id}` : '#'}
                      className={cn(
                        'h-14 rounded-lg border text-[10px] leading-tight flex flex-col items-center justify-center transition-all duration-150',
                        STATUS_BG[status],
                        !visible && 'opacity-25 grayscale pointer-events-none',
                        visible && status === 'sold' && 'pointer-events-none opacity-60',
                        visible && status === 'available' && 'hover:shadow-sm hover:scale-[1.02]',
                      )}
                      title={`${STATUS_LABEL[status]} · ${apt.rooms}к · ${apt.area} м²`}
                    >
                      <span className="font-semibold">
                        {apt.rooms}к · {apt.area}м²
                      </span>
                      <span className="opacity-80">{formatPrice(apt.price)}</span>
                    </Link>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Chessboard;
