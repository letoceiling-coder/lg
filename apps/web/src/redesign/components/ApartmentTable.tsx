import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Apartment, SortField, SortDir } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';
import MissingPhotoPlaceholder from '@/redesign/components/MissingPhotoPlaceholder';

interface Props {
  apartments: Apartment[];
  sort: { field: SortField; dir: SortDir };
  onSort: (field: SortField) => void;
}

type AptStatus = Apartment['status'];

const STATUS_LABEL: Record<AptStatus, string> = {
  available: 'Свободна',
  reserved: 'Бронь',
  sold: 'Продана',
};

const STATUS_CLASS: Record<AptStatus, string> = {
  available: 'text-green-700',
  reserved: 'text-amber-600',
  sold: 'text-muted-foreground',
};

type GroupRow = {
  key: string;
  buildingKey: string;
  buildingLabel: string;
  roomCategory: number;
  apartments: Apartment[];
  areaMin: number;
  areaMax: number;
  priceMin: number;
  priceMax: number;
};

function roomLabel(roomCategory: number): string {
  if (roomCategory === 0) return 'Студия';
  return `${roomCategory}-к.кв`;
}

function formatAreaRange(min: number, max: number): string {
  if (Math.abs(min - max) < 0.001) return `${min.toLocaleString('ru-RU')} м²`;
  return `${min.toLocaleString('ru-RU')} м² - ${max.toLocaleString('ru-RU')} м²`;
}

function formatPriceRange(min: number, max: number): string {
  if (Math.abs(min - max) < 1) return formatPrice(min);
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

function buildingCaption(a: Apartment): string {
  const queue = a.buildingQueue?.trim();
  const name = a.buildingName?.trim();
  if (queue && name) return `${queue} очередь · ${name}`;
  if (queue) return `${queue} очередь`;
  if (name) return name;
  return `Корпус ${a.buildingId}`;
}

function hasPlanPreview(url: string | undefined): boolean {
  if (!url) return false;
  return !url.endsWith('/placeholder.svg');
}

type PreviewState = {
  url: string;
  x: number;
  y: number;
};

function getPreviewPosition(rect: DOMRect): { x: number; y: number } {
  const previewWidth = 220;
  const previewHeight = 300;
  const gap = 14;
  const pad = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = rect.right + gap;
  if (x + previewWidth > vw - pad) x = rect.left - previewWidth - gap;
  if (x < pad) x = Math.max(pad, vw - previewWidth - pad);

  let y = rect.top - 8;
  if (y + previewHeight > vh - pad) y = vh - previewHeight - pad;
  if (y < pad) y = pad;

  return { x, y };
}

const ApartmentTable = ({ apartments }: Props) => {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const grouped = useMemo<GroupRow[]>(() => {
    const groups = new Map<string, GroupRow>();
    for (const a of apartments) {
      const bKey = a.buildingId || 'unknown';
      const bLabel = buildingCaption(a);
      const rKey = `${bKey}:${a.rooms}`;
      const existing = groups.get(rKey);
      if (!existing) {
        groups.set(rKey, {
          key: rKey,
          buildingKey: bKey,
          buildingLabel: bLabel,
          roomCategory: a.rooms,
          apartments: [a],
          areaMin: a.area,
          areaMax: a.area,
          priceMin: a.price,
          priceMax: a.price,
        });
        continue;
      }
      existing.apartments.push(a);
      existing.areaMin = Math.min(existing.areaMin, a.area);
      existing.areaMax = Math.max(existing.areaMax, a.area);
      if (a.price > 0) {
        existing.priceMin = existing.priceMin > 0 ? Math.min(existing.priceMin, a.price) : a.price;
        existing.priceMax = Math.max(existing.priceMax, a.price);
      }
    }
    const rows = Array.from(groups.values());
    rows.forEach((g) => {
      g.apartments.sort((x, y) => {
        if (x.section !== y.section) return x.section - y.section;
        if (x.floor !== y.floor) return x.floor - y.floor;
        return (Number(x.number ?? 0) || 0) - (Number(y.number ?? 0) || 0);
      });
    });
    rows.sort((x, y) => {
      if (x.buildingLabel !== y.buildingLabel) return x.buildingLabel.localeCompare(y.buildingLabel, 'ru');
      return x.roomCategory - y.roomCategory;
    });
    return rows;
  }, [apartments]);

  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  const toggle = (k: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  if (!grouped.length) {
    return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Квартиры не найдены</div>;
  }

  return (
    <div className="space-y-3">
      {grouped.map((g) => {
        const isOpen = openKeys.has(g.key);
        return (
          <div key={g.key} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(g.key)}
              className="w-full grid grid-cols-[1.3fr_1.2fr_1.6fr_auto] gap-3 px-4 py-3 text-left items-center hover:bg-muted/30 transition-colors"
            >
              <div className="font-medium text-sm">
                <div>{g.buildingLabel}</div>
                <div className="text-xs text-muted-foreground">{roomLabel(g.roomCategory)}</div>
              </div>
              <div className="text-sm">{formatAreaRange(g.areaMin, g.areaMax)}</div>
              <div className="text-sm font-medium">{formatPriceRange(g.priceMin, g.priceMax)}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{g.apartments.length} квартир</span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isOpen ? (
              <div className="border-t border-border overflow-x-auto">
                <table className="min-w-[1180px] w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs">
                    <tr>
                      <th className="px-2 py-2 text-left w-20">План</th>
                      <th className="px-2 py-2 text-left">Корп.</th>
                      <th className="px-2 py-2 text-left">Секц.</th>
                      <th className="px-2 py-2 text-left">Эт.</th>
                      <th className="px-2 py-2 text-left">№ кв.</th>
                      <th className="px-2 py-2 text-left">S прив.</th>
                      <th className="px-2 py-2 text-left">S кухни</th>
                      <th className="px-2 py-2 text-left">Отделка</th>
                      <th className="px-2 py-2 text-left">Базовая</th>
                      <th className="px-2 py-2 text-left">При 100%</th>
                      <th className="px-2 py-2 text-left">За м²</th>
                      <th className="px-2 py-2 text-left">Экскл.</th>
                      <th className="px-2 py-2 text-left">Статус</th>
                      <th className="px-2 py-2 text-left">Вид</th>
                      <th className="px-2 py-2 text-left w-14"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.apartments.map((a) => {
                      const canOpen = a.status !== 'sold';
                      return (
                        <tr
                          key={a.id}
                          className={cn('border-t border-border/70 hover:bg-muted/20', canOpen && 'cursor-pointer')}
                          onClick={() => {
                            if (canOpen) navigate(`/apartment/${a.id}`);
                          }}
                        >
                          <td className="px-2 py-2">
                            {hasPlanPreview(a.planImage) ? (
                              <button
                                type="button"
                                className="w-14 h-14 rounded border bg-background hover:border-primary/40 transition-colors overflow-hidden"
                                onMouseEnter={(e) => {
                                  const pos = getPreviewPosition(e.currentTarget.getBoundingClientRect());
                                  setPreview({ url: a.planImage!, x: pos.x, y: pos.y });
                                }}
                                onMouseLeave={() => setPreview((prev) => (prev?.url === a.planImage ? null : prev))}
                                onFocus={(e) => {
                                  const pos = getPreviewPosition(e.currentTarget.getBoundingClientRect());
                                  setPreview({ url: a.planImage!, x: pos.x, y: pos.y });
                                }}
                                onBlur={() => setPreview((prev) => (prev?.url === a.planImage ? null : prev))}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <img src={a.planImage} alt="Планировка" className="w-full h-full object-contain" loading="lazy" />
                              </button>
                            ) : (
                              <MissingPhotoPlaceholder className="h-14 w-14 rounded border text-[9px]" />
                            )}
                          </td>
                          <td className="px-2 py-2">{a.buildingName || a.buildingId}</td>
                          <td className="px-2 py-2">{a.section}</td>
                          <td className="px-2 py-2">{a.floor}</td>
                          <td className="px-2 py-2">{a.number || '—'}</td>
                          <td className="px-2 py-2">{a.area} м²</td>
                          <td className="px-2 py-2">{a.kitchenArea} м²</td>
                          <td className="px-2 py-2 capitalize">{a.finishing}</td>
                          <td className={cn('px-2 py-2', formatPrice(a.price) === 'Цена по запросу' && 'text-[#6b7280]')}>
                            {formatPrice(a.price)}
                          </td>
                          <td className={cn('px-2 py-2 font-medium', formatPrice(a.price) === 'Цена по запросу' && 'text-[#6b7280]')}>
                            {formatPrice(a.price)}
                          </td>
                          <td className="px-2 py-2">
                            {formatPrice(a.price) !== 'Цена по запросу' && a.pricePerMeter > 0
                              ? `${a.pricePerMeter.toLocaleString('ru-RU')} ₽/м²`
                              : '—'}
                          </td>
                          <td className="px-2 py-2">—</td>
                          <td className={cn('px-2 py-2', STATUS_CLASS[a.status])}>{STATUS_LABEL[a.status]}</td>
                          <td className="px-2 py-2">
                            {canOpen ? (
                              <Link
                                to={`/apartment/${a.id}`}
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">
                            <button type="button" onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-muted">
                              <Plus className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="p-3 border-t border-border">
                  <button type="button" className="w-full rounded-lg border border-border py-2 text-sm hover:bg-muted/30" onClick={() => toggle(g.key)}>
                    Свернуть
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {preview ? (
        <div
          className="fixed z-50 pointer-events-none transition-all duration-150 ease-out"
          style={{ left: `${preview.x}px`, top: `${preview.y}px` }}
        >
          <div className="w-[220px] h-[300px] rounded-2xl border border-border/80 bg-background/95 shadow-[0_16px_44px_rgba(0,0,0,0.22)] p-2 backdrop-blur-[1px]">
            <img src={preview.url} alt="Увеличенная планировка" className="w-full h-full object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ApartmentTable;
