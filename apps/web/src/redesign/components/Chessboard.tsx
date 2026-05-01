import { Fragment, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { Apartment } from '@/redesign/data/types';

interface Props {
  apartments: Apartment[];
  floors: number;
  sections: number;
  buildingName: string;
  roomFilter?: number | null;
}

type StatusKey = Apartment['status'];

const STATUS_LABEL: Record<StatusKey, string> = {
  available: 'Свободная',
  reserved: 'Бронь',
  sold: 'Продано',
};

const CARD_CLASS: Record<StatusKey, string> = {
  available: 'bg-white text-[#333] border-[#e5e7eb] shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:border-[#111]',
  reserved: 'bg-[#f3f4f6] text-[#333] border-[#d1d5db] hover:border-[#111]',
  sold: 'bg-[#050505] text-white border-[#050505]',
};

const SWATCH_BG: Record<StatusKey, string> = {
  available: 'bg-white border-[#d1d5db]',
  reserved: 'bg-[#f3f4f6] border-[#9ca3af]',
  sold: 'bg-[#050505] border-[#050505]',
};

const STATUS_ORDER: StatusKey[] = ['available', 'reserved', 'sold'];

function apartmentNumber(apt: Apartment): number {
  const n = Number(apt.number ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function roomLabel(rooms: number): string {
  if (rooms === 0) return 'Студия';
  if (rooms > 0) return `${rooms}-к.кв`;
  return '';
}

function formatChessPrice(value: number): string {
  return `${Math.max(0, Math.round(value || 0)).toLocaleString('ru-RU')} ₽`;
}

function formatArea(value: number): string {
  return `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м²`;
}

function sectionTitle(section: number, buildingName: string): string {
  const normalizedName = buildingName.trim();
  return `секция ${section}${normalizedName ? ` · ${normalizedName}` : ''}`;
}

type SectionBoard = {
  section: number;
  floors: number[];
  columns: Array<Array<Apartment | null>>;
};

const Chessboard = ({ apartments, floors, sections, buildingName, roomFilter = null }: Props) => {
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

  const sectionNumbers = useMemo(() => {
    const fromApts = apartments
      .map((a) => Number(a.section ?? 1))
      .filter((n) => Number.isFinite(n) && n > 0);
    const fromCount = Array.from({ length: Math.max(sections, 1) }, (_, i) => i + 1);
    return Array.from(new Set([...fromCount, ...fromApts])).sort((a, b) => a - b);
  }, [apartments, sections]);

  const sectionBoards = useMemo<SectionBoard[]>(() => {
    const bySection = new Map<number, Map<number, Apartment[]>>();
    for (const a of apartments) {
      const floor = a.floor || 1;
      const section = Number(a.section ?? 1) || 1;
      const byFloor = bySection.get(section) ?? new Map<number, Apartment[]>();
      const arr = byFloor.get(floor) ?? [];
      arr.push(a);
      byFloor.set(floor, arr);
      bySection.set(section, byFloor);
    }

    const result: SectionBoard[] = [];
    const fallbackFloors = Array.from({ length: Math.max(floors, 1) }, (_, i) => Math.max(floors, 1) - i);
    for (const section of sectionNumbers) {
      const byFloor = bySection.get(section);
      if (!byFloor) {
        result.push({ section, floors: fallbackFloors, columns: [] });
        continue;
      }

      byFloor.forEach((arr) => {
        arr.sort((x, y) => apartmentNumber(x) - apartmentNumber(y) || x.area - y.area || x.id.localeCompare(y.id));
      });

      const floorNumbers = Array.from(byFloor.keys()).sort((a, b) => b - a);
      const maxColumns = Math.max(...Array.from(byFloor.values()).map((arr) => arr.length), 0);
      const columns = Array.from({ length: maxColumns }, (_, colIndex) =>
        floorNumbers.map((floor) => byFloor.get(floor)?.[colIndex] ?? null),
      );
      result.push({ section, floors: floorNumbers, columns });
    }
    return result;
  }, [apartments, floors, sectionNumbers]);

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
      {sectionBoards.map((board) => (
        <div key={board.section} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-muted/20 px-4 py-2 text-center text-xs font-medium text-muted-foreground">
            {sectionTitle(board.section, buildingName)}
          </div>
          <div className="overflow-x-auto p-3">
            <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `42px repeat(${Math.max(board.columns.length, 1)}, 118px)` }}>
              <div className="h-6" />
              {board.columns.length > 0 ? board.columns.map((_, idx) => (
                <div key={`col-head-${board.section}-${idx}`} className="h-6 text-center text-[11px] text-muted-foreground">
                  {idx + 1}
                </div>
              )) : (
                <div className="h-6" />
              )}

              {board.floors.map((floor, rowIndex) => (
                <Fragment key={`row-${board.section}-${floor}`}>
                  <div
                    key={`floor-${board.section}-${floor}`}
                    className="flex h-[86px] items-center justify-center rounded-lg bg-muted/20 text-xs font-medium text-muted-foreground"
                  >
                    {floor}
                  </div>
                  {board.columns.length > 0 ? board.columns.map((column, colIndex) => {
                    const apt = column[rowIndex] ?? null;
                    if (!apt) {
                      return (
                        <div
                          key={`empty-${board.section}-${floor}-${colIndex}`}
                          className="h-[86px] rounded-lg border border-dashed border-border/50 bg-muted/10"
                        />
                      );
                    }
                    const statusLabel = STATUS_LABEL[apt.status];
                    const dimmed = !activeStatuses.has(apt.status) || (roomFilter !== null && apt.rooms !== roomFilter);
                    const content = (
                      <div
                        className={cn(
                          'flex h-[86px] flex-col justify-between rounded-lg border px-2.5 py-2 text-[11px] leading-tight transition',
                          CARD_CLASS[apt.status],
                          dimmed && 'opacity-25',
                        )}
                        title={`№ ${apt.number || apt.id} · ${statusLabel} · ${formatArea(apt.area)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate font-semibold" title={roomLabel(apt.rooms)}>{roomLabel(apt.rooms)}</span>
                          <span className="shrink-0" title={`№ ${apt.number || apt.id}`}>№ {apt.number || apt.id}</span>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{formatChessPrice(apt.price)}</div>
                          <div className="mt-1 opacity-80" title={statusLabel}>{statusLabel}</div>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <span className="truncate opacity-80" title={apt.finishing}>{apt.finishing === 'без отделки' ? '' : apt.finishing}</span>
                          <span className="shrink-0" title={formatArea(apt.area)}>{formatArea(apt.area)}</span>
                        </div>
                      </div>
                    );
                    if (apt.status === 'sold') return <div key={apt.id}>{content}</div>;
                    return <Link key={apt.id} to={`/apartment/${apt.id}`}>{content}</Link>;
                  }) : (
                    <div className="h-[86px] rounded-lg border border-dashed border-border/50 bg-muted/10" />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Chessboard;
